import { existsSync, readFileSync } from "node:fs";

import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { reset } from "drizzle-seed";

import { dietPlan, dietPlanMeal } from "./schema/diet-plan";
import { foodCategory } from "./schema/food-category";
import { foodItem } from "./schema/food-item";
import { foodItemCategory } from "./schema/food-item-category";
import { meal, mealItem } from "./schema/meal";

/**
 * Seeds the food catalogue from a USDA FoodData Central "Foundation Foods"
 * JSON export, back-filling missing macros from the USDA API when
 * `USDA_API_KEY` is set.
 *
 * **This script is destructive.** It resets the diet-domain tables before
 * inserting. It is a bootstrap/refresh tool, not something to run casually
 * against a database that already holds authored meals or plans.
 *
 * Usage:
 *   bun run src/seed.ts /path/to/FoodData_Central_foundation_food_json.json
 *   USDA_FOODDATA_JSON_PATH=/path/to/file.json bun run src/seed.ts
 *
 * Optional: `USDA_API_KEY` enables the macro back-fill chain.
 */

/**
 * Paths are relative to the package directory (bun's cwd for `db:seed`).
 * `apps/server` is the new home of the API and therefore of `DATABASE_URL`;
 * the repo root `.env` is the fallback for compose / CI shells that keep a
 * single env file. In a deploy neither exists and the real environment wins.
 */
const ENV_CANDIDATES = ["../../apps/server/.env", "../../.env"];
const envPath = ENV_CANDIDATES.find((candidate) => existsSync(candidate));
if (envPath) {
	dotenv.config({ path: envPath });
}

const USDA_JSON_PATH_ENV_VAR = "USDA_FOODDATA_JSON_PATH";

/**
 * Source JSON location. CLI argument wins over the env var so a one-off run can
 * point at a different export without editing `.env`.
 *
 * This used to be a hardcoded absolute path on one developer's laptop, which
 * made the script unrunnable everywhere else.
 */
function resolveUsdaJsonPath(): string {
	const fromArgv = process.argv[2]?.trim();
	const fromEnv = process.env[USDA_JSON_PATH_ENV_VAR]?.trim();
	const jsonPath = fromArgv || fromEnv;

	if (!jsonPath) {
		throw new Error(
			`No USDA FoodData Central JSON configured. Pass the file as the first argument (\`bun run src/seed.ts <path>\`) or set ${USDA_JSON_PATH_ENV_VAR}. Download the "Foundation Foods" JSON export from https://fdc.nal.usda.gov/download-datasets.`
		);
	}

	if (!existsSync(jsonPath)) {
		throw new Error(
			`USDA FoodData Central JSON not found at "${jsonPath}". Check the path passed as the first argument or set in ${USDA_JSON_PATH_ENV_VAR}.`
		);
	}

	return jsonPath;
}

const NUTRIENT_PROTEIN = "203";
const NUTRIENT_CARBS = "205";
const NUTRIENT_FAT = "204";
const NUTRIENT_CALORIES = "208";

interface USDANutrient {
	nutrient?: { number?: string | number | null } | null;
	nutrientNumber?: string | number | null;
	number?: string | number | null;
	amount?: number;
	value?: number;
}

interface USDAFoodPortion {
	gramWeight?: number;
}

interface USDAFoodItem {
	fdcId: number;
	description: string;
	foodCategory?: { description: string };
	foodNutrients: USDANutrient[];
	foodPortions?: USDAFoodPortion[];
}

interface USDAData {
	FoundationFoods: USDAFoodItem[];
}

const USDA_API_BASE_URL = "https://api.nal.usda.gov/fdc/v1";
const USDA_REQUEST_TIMEOUT_MS = 10_000;
const USDA_MAX_RETRIES = 3;
const USDA_SEARCH_PAGE_SIZE = 10;
const MS_PER_SECOND = 1000;
const FOOD_ITEM_BATCH_SIZE = 100;

const usdaNutrientsCache = new Map<number, USDANutrient[]>();
const usdaSearchNutrientsCache = new Map<string, USDANutrient[] | null>();

const extractMacro = (
	nutrients: USDANutrient[],
	number: string
): string | null => {
	const nutrient = nutrients.find((n) => {
		const nutrientNumber = n.nutrient?.number ?? n.nutrientNumber ?? n.number;
		return nutrientNumber != null && String(nutrientNumber) === number;
	});
	const amount = nutrient?.amount ?? nutrient?.value;
	return amount !== undefined && amount !== null ? String(amount) : null;
};

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

const parseRetryAfterMs = (retryAfter: string | null): number | null => {
	if (!retryAfter) {
		return null;
	}

	const seconds = Number(retryAfter);
	if (Number.isFinite(seconds) && seconds > 0) {
		return Math.ceil(seconds * MS_PER_SECOND);
	}

	const dateMs = Date.parse(retryAfter);
	if (Number.isNaN(dateMs)) {
		return null;
	}
	const deltaMs = dateMs - Date.now();
	return deltaMs > 0 ? deltaMs : null;
};

const countAvailableMacros = (nutrients: USDANutrient[]): number => {
	let count = 0;
	if (extractMacro(nutrients, NUTRIENT_CALORIES) !== null) {
		count += 1;
	}
	if (extractMacro(nutrients, NUTRIENT_PROTEIN) !== null) {
		count += 1;
	}
	if (extractMacro(nutrients, NUTRIENT_CARBS) !== null) {
		count += 1;
	}
	if (extractMacro(nutrients, NUTRIENT_FAT) !== null) {
		count += 1;
	}
	return count;
};

const fetchUSDAFoodNutrientsByFdcId = async (
	fdcId: number,
	apiKey: string
): Promise<USDANutrient[] | null> => {
	const cached = usdaNutrientsCache.get(fdcId);
	if (cached) {
		return cached;
	}

	for (let attempt = 1; attempt <= USDA_MAX_RETRIES; attempt += 1) {
		const controller = new AbortController();
		const timeout = setTimeout(
			() => controller.abort(),
			USDA_REQUEST_TIMEOUT_MS
		);

		try {
			const url = `${USDA_API_BASE_URL}/food/${fdcId}?api_key=${encodeURIComponent(
				apiKey
			)}&format=abridged`;
			const response = await fetch(url, { signal: controller.signal });

			if (response.status === 429) {
				const retryAfterMs = parseRetryAfterMs(
					response.headers.get("retry-after")
				);
				const backoffMs = retryAfterMs ?? attempt * MS_PER_SECOND;
				console.warn(
					`⚠️  USDA rate-limited for fdcId=${fdcId} (attempt ${attempt}/${USDA_MAX_RETRIES}); retrying in ${backoffMs}ms`
				);
				if (attempt < USDA_MAX_RETRIES) {
					await sleep(backoffMs);
					continue;
				}
				return null;
			}

			if (!response.ok) {
				console.warn(
					`⚠️  USDA request failed for fdcId=${fdcId} with status ${response.status}`
				);
				return null;
			}

			const body = (await response.json()) as {
				foodNutrients?: USDANutrient[];
			};
			const nutrients = Array.isArray(body.foodNutrients)
				? body.foodNutrients
				: [];
			usdaNutrientsCache.set(fdcId, nutrients);
			return nutrients;
		} catch (error) {
			const isAbortError =
				error instanceof Error &&
				(error.name === "AbortError" || error.name === "TimeoutError");
			console.warn(
				`⚠️  USDA request error for fdcId=${fdcId} (attempt ${attempt}/${USDA_MAX_RETRIES}): ${
					isAbortError ? "timeout" : "request failed"
				}`
			);
			if (attempt < USDA_MAX_RETRIES) {
				await sleep(attempt * MS_PER_SECOND);
				continue;
			}
			return null;
		} finally {
			clearTimeout(timeout);
		}
	}

	return null;
};

const fetchUSDAFoodNutrientsByDescription = async (
	description: string,
	apiKey: string
): Promise<USDANutrient[] | null> => {
	const query = description.trim().toLowerCase();
	const cached = usdaSearchNutrientsCache.get(query);
	if (cached !== undefined) {
		return cached;
	}

	for (let attempt = 1; attempt <= USDA_MAX_RETRIES; attempt += 1) {
		const controller = new AbortController();
		const timeout = setTimeout(
			() => controller.abort(),
			USDA_REQUEST_TIMEOUT_MS
		);

		try {
			const url = `${USDA_API_BASE_URL}/foods/search?api_key=${encodeURIComponent(
				apiKey
			)}&query=${encodeURIComponent(description)}&pageSize=${USDA_SEARCH_PAGE_SIZE}`;
			const response = await fetch(url, { signal: controller.signal });

			if (response.status === 429) {
				const retryAfterMs = parseRetryAfterMs(
					response.headers.get("retry-after")
				);
				const backoffMs = retryAfterMs ?? attempt * MS_PER_SECOND;
				if (attempt < USDA_MAX_RETRIES) {
					await sleep(backoffMs);
					continue;
				}
				usdaSearchNutrientsCache.set(query, null);
				return null;
			}

			if (!response.ok) {
				usdaSearchNutrientsCache.set(query, null);
				return null;
			}

			const body = (await response.json()) as {
				foods?: Array<{
					dataType?: string;
					foodNutrients?: USDANutrient[];
				}>;
			};

			const foods = Array.isArray(body.foods) ? body.foods : [];
			const nonBranded = foods.filter((food) => food.dataType !== "Branded");
			const candidates = nonBranded.length > 0 ? nonBranded : foods;

			let best: USDANutrient[] | null = null;
			let bestScore = -1;
			for (const candidate of candidates) {
				const nutrients = Array.isArray(candidate.foodNutrients)
					? candidate.foodNutrients
					: [];
				const score = countAvailableMacros(nutrients);
				if (score > bestScore) {
					best = nutrients;
					bestScore = score;
				}
			}

			const result = bestScore > 0 ? best : null;
			usdaSearchNutrientsCache.set(query, result);
			return result;
		} catch {
			if (attempt < USDA_MAX_RETRIES) {
				await sleep(attempt * MS_PER_SECOND);
				continue;
			}
			usdaSearchNutrientsCache.set(query, null);
			return null;
		} finally {
			clearTimeout(timeout);
		}
	}

	usdaSearchNutrientsCache.set(query, null);
	return null;
};

const main = async () => {
	const usdaJsonPath = resolveUsdaJsonPath();

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error(
			"DATABASE_URL is not set. Add it to apps/server/.env, the repo root .env, or the environment."
		);
	}

	console.info("🔗 Connecting to database...");
	const db = drizzle(databaseUrl);
	const usdaApiKey = process.env.USDA_API_KEY;

	/**
	 * Reset scope. Only the diet catalogue is cleared — auth tables,
	 * assignments, consumptions, overrides, body composition and the audit log
	 * are deliberately untouched.
	 *
	 * `meal` / `mealItem` / `dietPlan` / `dietPlanMeal` are reset even though
	 * this script never re-seeds them, and that is intentional: `meal_item`
	 * references `food_item` with `onDelete: 'restrict'`, so the food catalogue
	 * cannot be replaced while meal lines still point at the old rows. Clearing
	 * the meals and plans built on top of the old catalogue keeps the
	 * diet-domain tables mutually consistent instead of leaving meals with
	 * dangling lines and stale `total_*` aggregates.
	 *
	 * Consequence to be aware of before running this: meals and diet plans are
	 * authored in the app by nutritionists, not derived from USDA data, so they
	 * are gone for good and those four tables are left empty by design.
	 * Dependent rows in `diet_plan_meal_consumption*` and the override tables go
	 * with them.
	 */
	const dietSchema = {
		foodCategory,
		foodItemCategory,
		foodItem,
		meal,
		mealItem,
		dietPlan,
		dietPlanMeal,
	};

	console.info("🗑️  Resetting diet-related tables...");
	await reset(db, dietSchema);
	console.info("✅ Reset complete\n");

	console.info(`📖 Reading USDA JSON from ${usdaJsonPath}...`);
	const raw = readFileSync(usdaJsonPath, "utf-8");
	const data: USDAData = JSON.parse(raw);
	const foods = data.FoundationFoods;
	console.info(`   Found ${foods.length} food items\n`);

	const categoryNames = new Set<string>();
	for (const food of foods) {
		if (food.foodCategory?.description) {
			categoryNames.add(food.foodCategory.description);
		}
	}
	console.info(`📁 Inserting ${categoryNames.size} categories...`);

	const categoryMap = new Map<string, string>();
	for (const name of categoryNames) {
		const result = await db
			.insert(foodCategory)
			.values({ name })
			.returning({ id: foodCategory.id });
		const insertedCategory = result[0];
		if (insertedCategory) {
			categoryMap.set(name, insertedCategory.id);
		}
	}
	console.info("✅ Categories inserted\n");

	console.info(`🍎 Inserting ${foods.length} food items...`);
	let inserted = 0;
	let foodsWithAnyMissing = 0;
	let fieldsFilledViaApi = 0;
	let fieldsFilledViaSearch = 0;
	let remainingNullFields = 0;

	for (let i = 0; i < foods.length; i += FOOD_ITEM_BATCH_SIZE) {
		const batch = foods.slice(i, i + FOOD_ITEM_BATCH_SIZE);
		const values = [];
		const rowCategoryIds: string[] = [];

		for (const f of batch) {
			const categoryDescription = f.foodCategory?.description;
			if (!categoryDescription) {
				continue;
			}
			const categoryId = categoryMap.get(categoryDescription);
			if (!categoryId) {
				continue;
			}

			let calories = extractMacro(f.foodNutrients, NUTRIENT_CALORIES);
			let protein = extractMacro(f.foodNutrients, NUTRIENT_PROTEIN);
			let carbs = extractMacro(f.foodNutrients, NUTRIENT_CARBS);
			let fat = extractMacro(f.foodNutrients, NUTRIENT_FAT);

			const missingBefore = [calories, protein, carbs, fat].filter(
				(value) => value === null
			).length;

			if (missingBefore > 0) {
				foodsWithAnyMissing += 1;

				if (usdaApiKey) {
					const apiNutrients = await fetchUSDAFoodNutrientsByFdcId(
						f.fdcId,
						usdaApiKey
					);
					if (apiNutrients) {
						if (!calories) {
							calories = extractMacro(apiNutrients, NUTRIENT_CALORIES);
						}
						if (!protein) {
							protein = extractMacro(apiNutrients, NUTRIENT_PROTEIN);
						}
						if (!carbs) {
							carbs = extractMacro(apiNutrients, NUTRIENT_CARBS);
						}
						if (!fat) {
							fat = extractMacro(apiNutrients, NUTRIENT_FAT);
						}
					}

					const missingAfterFdcLookup = [calories, protein, carbs, fat].filter(
						(value) => value === null
					).length;
					if (missingAfterFdcLookup > 0) {
						const searchNutrients = await fetchUSDAFoodNutrientsByDescription(
							f.description,
							usdaApiKey
						);
						if (searchNutrients) {
							const beforeSearch = [calories, protein, carbs, fat].filter(
								(value) => value === null
							).length;
							if (!calories) {
								calories = extractMacro(searchNutrients, NUTRIENT_CALORIES);
							}
							if (!protein) {
								protein = extractMacro(searchNutrients, NUTRIENT_PROTEIN);
							}
							if (!carbs) {
								carbs = extractMacro(searchNutrients, NUTRIENT_CARBS);
							}
							if (!fat) {
								fat = extractMacro(searchNutrients, NUTRIENT_FAT);
							}
							const afterSearch = [calories, protein, carbs, fat].filter(
								(value) => value === null
							).length;
							fieldsFilledViaSearch += beforeSearch - afterSearch;
						}
					}
				}
			}

			const missingAfter = [calories, protein, carbs, fat].filter(
				(value) => value === null
			).length;
			fieldsFilledViaApi += missingBefore - missingAfter;
			remainingNullFields += missingAfter;

			values.push({
				name: f.description,
				calories: calories ?? "0",
				protein: protein ?? "0",
				carbs: carbs ?? "0",
				fat: fat ?? "0",
				unit: "100g" as const,
				gramsPerUnit: "100",
			});
			rowCategoryIds.push(categoryId);
		}

		if (values.length > 0) {
			const insertedRows = await db
				.insert(foodItem)
				.values(values)
				.returning({ id: foodItem.id });
			await db.insert(foodItemCategory).values(
				insertedRows.flatMap((row, idx) => {
					const foodCategoryId = rowCategoryIds[idx];
					return foodCategoryId
						? [{ foodItemId: row.id, foodCategoryId }]
						: [];
				})
			);
			inserted += values.length;
		}
	}
	console.info(`✅ Inserted ${inserted} food items\n`);

	console.info("📊 Seeding Summary:");
	console.info(`   Categories: ${categoryNames.size}`);
	console.info(`   Food Items: ${inserted}`);
	console.info(
		`   Foods with missing macros before fallback: ${foodsWithAnyMissing}`
	);
	console.info(
		`   Macro fields filled from USDA API (by food ID): ${fieldsFilledViaApi}`
	);
	console.info(
		`   Macro fields filled from USDA API (name search): ${fieldsFilledViaSearch}`
	);
	console.info(`   Remaining null macro fields: ${remainingNullFields}`);
	console.info("\n🎉 Seed complete!");
};

try {
	await main();
	process.exit(0);
} catch (error) {
	console.error("❌ Seeding failed:", error);
	process.exit(1);
}
