/**
 * DESTRUCTIVE. This script RESETS the food catalogue and every table built on
 * it — food categories, food items, meals, meal items, diet plans and diet plan
 * meals — then re-imports the catalogue from a USDA FoodData Central export.
 * Dependent consumption and override rows go with them via cascade.
 *
 * It is deliberately NOT part of `db:deploy`, which runs migrations only. Run
 * it by hand, against a database you are willing to lose the catalogue on:
 *
 *     bun run --cwd packages/db db:seed -- /path/to/FoodData_Central_foundation_food.json
 *
 * or set USDA_FOODDATA_JSON_PATH. It refuses to run without a path rather than
 * silently wiping.
 */

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
 * inserting — see the reset block in `main` for exactly what that costs. It is
 * a bootstrap / catalogue-refresh tool, not something to run casually against a
 * database that already holds authored meals or plans.
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
 * Source JSON location. The CLI argument wins over the env var so a one-off run
 * can point at a different export without editing `.env`.
 *
 * This used to be a hardcoded absolute path inside one developer's home
 * directory, which made the script unrunnable everywhere else.
 */
function resolveUsdaJsonPath(): string {
	const fromArgv = process.argv[2]?.trim();
	const fromEnv = process.env[USDA_JSON_PATH_ENV_VAR]?.trim();
	const jsonPath = fromArgv || fromEnv;

	if (!jsonPath) {
		throw new Error(
			`No USDA FoodData Central JSON configured. Pass the file as the first argument ("bun run src/seed.ts <path>") or set ${USDA_JSON_PATH_ENV_VAR}. Download the "Foundation Foods" JSON export from https://fdc.nal.usda.gov/download-datasets.`
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
	amount?: number;
	number?: string | number | null;
	nutrient?: { number?: string | number | null } | null;
	nutrientNumber?: string | number | null;
	value?: number;
}

interface USDAFoodPortion {
	gramWeight?: number;
}

interface USDAFoodItem {
	description: string;
	fdcId: number;
	foodCategory?: { description: string };
	foodNutrients: USDANutrient[];
	foodPortions?: USDAFoodPortion[];
}

interface USDAData {
	FoundationFoods: USDAFoodItem[];
}

/** The four macro columns, each either a `numeric` string literal or unknown. */
interface MacroValues {
	calories: string | null;
	carbs: string | null;
	fat: string | null;
	protein: string | null;
}

const NUTRIENT_NUMBER_BY_MACRO: Record<keyof MacroValues, string> = {
	calories: NUTRIENT_CALORIES,
	protein: NUTRIENT_PROTEIN,
	carbs: NUTRIENT_CARBS,
	fat: NUTRIENT_FAT,
};

const MACRO_KEYS = Object.keys(NUTRIENT_NUMBER_BY_MACRO) as Array<
	keyof MacroValues
>;

const USDA_API_BASE_URL = "https://api.nal.usda.gov/fdc/v1";
const USDA_REQUEST_TIMEOUT_MS = 10_000;
const USDA_MAX_RETRIES = 3;
const USDA_SEARCH_PAGE_SIZE = 10;
const USDA_RATE_LIMITED_STATUS = 429;
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

const extractMacroValues = (nutrients: USDANutrient[]): MacroValues => ({
	calories: extractMacro(nutrients, NUTRIENT_CALORIES),
	protein: extractMacro(nutrients, NUTRIENT_PROTEIN),
	carbs: extractMacro(nutrients, NUTRIENT_CARBS),
	fat: extractMacro(nutrients, NUTRIENT_FAT),
});

const countMissingMacros = (macros: MacroValues): number =>
	MACRO_KEYS.filter((key) => macros[key] === null).length;

/** Fills only the macros still unknown, leaving already-resolved values alone. */
const fillMissingMacros = (
	target: MacroValues,
	nutrients: USDANutrient[]
): void => {
	for (const key of MACRO_KEYS) {
		if (!target[key]) {
			target[key] = extractMacro(nutrients, NUTRIENT_NUMBER_BY_MACRO[key]);
		}
	}
};

const countAvailableMacros = (nutrients: USDANutrient[]): number =>
	MACRO_KEYS.length - countMissingMacros(extractMacroValues(nutrients));

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

/** Honors `Retry-After` on 429, falling back to a linear backoff per attempt. */
const rateLimitBackoffMs = (response: Response, attempt: number): number =>
	parseRetryAfterMs(response.headers.get("retry-after")) ??
	attempt * MS_PER_SECOND;

type UsdaFetchOutcome =
	| { status: "ok"; response: Response }
	| { status: "timeout" }
	| { status: "failed" };

/** One USDA request, aborted after {@link USDA_REQUEST_TIMEOUT_MS}. Never throws. */
const fetchUsdaWithTimeout = async (url: string): Promise<UsdaFetchOutcome> => {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), USDA_REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(url, { signal: controller.signal });
		return { status: "ok", response };
	} catch (error) {
		const isAbortError =
			error instanceof Error &&
			(error.name === "AbortError" || error.name === "TimeoutError");
		return { status: isAbortError ? "timeout" : "failed" };
	} finally {
		clearTimeout(timeout);
	}
};

/**
 * Abridged `/food/{fdcId}` lookup. Memoized per `fdcId`, 3 attempts, honoring
 * `Retry-After` on 429.
 */
const fetchUSDAFoodNutrientsByFdcId = async (
	fdcId: number,
	apiKey: string
): Promise<USDANutrient[] | null> => {
	const cached = usdaNutrientsCache.get(fdcId);
	if (cached) {
		return cached;
	}

	const url = `${USDA_API_BASE_URL}/food/${fdcId}?api_key=${encodeURIComponent(
		apiKey
	)}&format=abridged`;

	for (let attempt = 1; attempt <= USDA_MAX_RETRIES; attempt += 1) {
		const outcome = await fetchUsdaWithTimeout(url);

		if (outcome.status !== "ok") {
			console.warn(
				`⚠️  USDA request error for fdcId=${fdcId} (attempt ${attempt}/${USDA_MAX_RETRIES}): ${
					outcome.status === "timeout" ? "timeout" : "request failed"
				}`
			);
			if (attempt < USDA_MAX_RETRIES) {
				await sleep(attempt * MS_PER_SECOND);
				continue;
			}
			return null;
		}

		const { response } = outcome;

		if (response.status === USDA_RATE_LIMITED_STATUS) {
			const backoffMs = rateLimitBackoffMs(response, attempt);
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

		const body = (await response.json()) as { foodNutrients?: USDANutrient[] };
		const nutrients = Array.isArray(body.foodNutrients)
			? body.foodNutrients
			: [];
		usdaNutrientsCache.set(fdcId, nutrients);
		return nutrients;
	}

	return null;
};

/** Prefers non-`Branded` results, then the candidate carrying the most macros. */
const pickBestSearchNutrients = (
	foods: Array<{ dataType?: string; foodNutrients?: USDANutrient[] }>
): USDANutrient[] | null => {
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

	return bestScore > 0 ? best : null;
};

/**
 * `/foods/search` fallback by description. Memoized per query (negative results
 * included), 3 attempts, honoring `Retry-After` on 429.
 */
const fetchUSDAFoodNutrientsByDescription = async (
	description: string,
	apiKey: string
): Promise<USDANutrient[] | null> => {
	const query = description.trim().toLowerCase();
	const cached = usdaSearchNutrientsCache.get(query);
	if (cached !== undefined) {
		return cached;
	}

	const url = `${USDA_API_BASE_URL}/foods/search?api_key=${encodeURIComponent(
		apiKey
	)}&query=${encodeURIComponent(description)}&pageSize=${USDA_SEARCH_PAGE_SIZE}`;

	for (let attempt = 1; attempt <= USDA_MAX_RETRIES; attempt += 1) {
		const outcome = await fetchUsdaWithTimeout(url);

		if (outcome.status !== "ok") {
			if (attempt < USDA_MAX_RETRIES) {
				await sleep(attempt * MS_PER_SECOND);
				continue;
			}
			usdaSearchNutrientsCache.set(query, null);
			return null;
		}

		const { response } = outcome;

		if (response.status === USDA_RATE_LIMITED_STATUS) {
			if (attempt < USDA_MAX_RETRIES) {
				await sleep(rateLimitBackoffMs(response, attempt));
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
			foods?: Array<{ dataType?: string; foodNutrients?: USDANutrient[] }>;
		};
		const result = pickBestSearchNutrients(
			Array.isArray(body.foods) ? body.foods : []
		);
		usdaSearchNutrientsCache.set(query, result);
		return result;
	}

	usdaSearchNutrientsCache.set(query, null);
	return null;
};

interface MacroResolution {
	filledViaSearch: number;
	macros: MacroValues;
	missingAfter: number;
	missingBefore: number;
}

/**
 * Macros for one food: whatever the export carries, then — only when something
 * is missing and an API key is configured — the fdcId lookup, then the
 * name-search fallback.
 */
const resolveMacrosForFood = async (
	food: USDAFoodItem,
	usdaApiKey: string | undefined
): Promise<MacroResolution> => {
	const macros = extractMacroValues(food.foodNutrients);
	const missingBefore = countMissingMacros(macros);
	let filledViaSearch = 0;

	if (missingBefore > 0 && usdaApiKey) {
		const apiNutrients = await fetchUSDAFoodNutrientsByFdcId(
			food.fdcId,
			usdaApiKey
		);
		if (apiNutrients) {
			fillMissingMacros(macros, apiNutrients);
		}

		if (countMissingMacros(macros) > 0) {
			const searchNutrients = await fetchUSDAFoodNutrientsByDescription(
				food.description,
				usdaApiKey
			);
			if (searchNutrients) {
				const beforeSearch = countMissingMacros(macros);
				fillMissingMacros(macros, searchNutrients);
				filledViaSearch = beforeSearch - countMissingMacros(macros);
			}
		}
	}

	return {
		macros,
		missingBefore,
		missingAfter: countMissingMacros(macros),
		filledViaSearch,
	};
};

type SeedDb = ReturnType<typeof drizzle>;

/** Inserts one `food_category` per distinct USDA category, keyed by name. */
const seedFoodCategories = async (
	db: SeedDb,
	foods: USDAFoodItem[]
): Promise<Map<string, string>> => {
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
	return categoryMap;
};

/** Insert shape for a `food_item` row. */
type FoodItemInsert = typeof foodItem.$inferInsert;

interface SeedStats {
	fieldsFilledViaApi: number;
	fieldsFilledViaSearch: number;
	foodsWithAnyMissing: number;
	inserted: number;
	remainingNullFields: number;
}

/** One batch of `food_item` rows plus their `food_item_category` join rows. */
const insertFoodItemBatch = async (
	db: SeedDb,
	values: FoodItemInsert[],
	rowCategoryIds: string[]
): Promise<void> => {
	if (values.length === 0) {
		return;
	}

	const insertedRows = await db
		.insert(foodItem)
		.values(values)
		.returning({ id: foodItem.id });

	await db.insert(foodItemCategory).values(
		insertedRows.flatMap((row, idx) => {
			const foodCategoryId = rowCategoryIds[idx];
			return foodCategoryId ? [{ foodItemId: row.id, foodCategoryId }] : [];
		})
	);
};

const seedFoodItems = async (
	db: SeedDb,
	foods: USDAFoodItem[],
	categoryMap: Map<string, string>,
	usdaApiKey: string | undefined
): Promise<SeedStats> => {
	console.info(`🍎 Inserting ${foods.length} food items...`);

	const stats: SeedStats = {
		inserted: 0,
		foodsWithAnyMissing: 0,
		fieldsFilledViaApi: 0,
		fieldsFilledViaSearch: 0,
		remainingNullFields: 0,
	};

	for (let i = 0; i < foods.length; i += FOOD_ITEM_BATCH_SIZE) {
		const batch = foods.slice(i, i + FOOD_ITEM_BATCH_SIZE);
		const values: FoodItemInsert[] = [];
		const rowCategoryIds: string[] = [];

		for (const food of batch) {
			const categoryDescription = food.foodCategory?.description;
			const categoryId = categoryDescription
				? categoryMap.get(categoryDescription)
				: undefined;
			if (!categoryId) {
				continue;
			}

			const { macros, missingBefore, missingAfter, filledViaSearch } =
				await resolveMacrosForFood(food, usdaApiKey);

			if (missingBefore > 0) {
				stats.foodsWithAnyMissing += 1;
			}
			stats.fieldsFilledViaApi += missingBefore - missingAfter;
			stats.fieldsFilledViaSearch += filledViaSearch;
			stats.remainingNullFields += missingAfter;

			values.push({
				name: food.description,
				// Anything still unknown is stored as '0' — the columns are NOT NULL.
				calories: macros.calories ?? "0",
				protein: macros.protein ?? "0",
				carbs: macros.carbs ?? "0",
				fat: macros.fat ?? "0",
				unit: "100g",
				gramsPerUnit: "100",
			});
			rowCategoryIds.push(categoryId);
		}

		await insertFoodItemBatch(db, values, rowCategoryIds);
		stats.inserted += values.length;
	}

	console.info(`✅ Inserted ${stats.inserted} food items\n`);
	return stats;
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
	 * assignments, body composition and the audit log are deliberately
	 * untouched.
	 *
	 * `meal` / `mealItem` / `dietPlan` / `dietPlanMeal` are reset even though
	 * this script never re-seeds them, and that is intentional rather than an
	 * oversight: `meal_item.food_item_id` references `food_item` with
	 * `onDelete: 'restrict'`, so the catalogue cannot be replaced while meal
	 * lines still point at the old rows. Clearing the meals and plans built on
	 * top of the old catalogue keeps the diet-domain tables mutually consistent
	 * instead of leaving meals with dangling lines and stale `total_*`
	 * aggregates.
	 *
	 * Know before running: meals and diet plans are authored in the app by
	 * nutritionists, not derived from USDA data, so they are not recoverable
	 * from this script and those four tables are left empty afterwards. Rows in
	 * the consumption and override tables that hang off them go too.
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
	const data: USDAData = JSON.parse(readFileSync(usdaJsonPath, "utf-8"));
	const foods = data.FoundationFoods;
	console.info(`   Found ${foods.length} food items\n`);

	const categoryMap = await seedFoodCategories(db, foods);
	const stats = await seedFoodItems(db, foods, categoryMap, usdaApiKey);

	console.info("📊 Seeding Summary:");
	console.info(`   Categories: ${categoryMap.size}`);
	console.info(`   Food Items: ${stats.inserted}`);
	console.info(
		`   Foods with missing macros before fallback: ${stats.foodsWithAnyMissing}`
	);
	console.info(
		`   Macro fields filled from USDA API (by food ID): ${stats.fieldsFilledViaApi}`
	);
	console.info(
		`   Macro fields filled from USDA API (name search): ${stats.fieldsFilledViaSearch}`
	);
	console.info(`   Remaining null macro fields: ${stats.remainingNullFields}`);
	console.info("\n🎉 Seed complete!");
};

try {
	await main();
	process.exit(0);
} catch (error) {
	console.error("❌ Seeding failed:", error);
	process.exit(1);
}
