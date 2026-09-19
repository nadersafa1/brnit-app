/**
 * Self-contained DEMO seeder. Fills every screen of the app with realistic,
 * runnable data: a food catalogue, two organizations, one user per distinct
 * access level, InBody-style assessments, authored meals, diet plans,
 * assignments that cover *today*, consumption history and food swaps.
 *
 *     bun run --cwd packages/db db:seed:demo
 *     # or, from the repo root
 *     bun run db:seed:demo
 *
 * Deliberately NOT `seed.ts`. That script is the USDA FoodData Central
 * importer: it needs an external JSON export and it truncates the food
 * catalogue. This one needs nothing but a migrated database, embeds all of its
 * data as literals, and is **idempotent** — every row carries a deterministic
 * id derived from a stable key, and every write is an upsert. Re-running
 * refreshes the demo dataset in place; it never duplicates and never truncates.
 * The only deletes are scoped to demo-owned rows that this file no longer
 * declares (see `pruneStaleRows`).
 *
 * ---------------------------------------------------------------------------
 * NUTRITION DATA PROVENANCE
 * ---------------------------------------------------------------------------
 * Macros are per **one unit** (see `getMacroFactor` in
 * `@brnit/domain/food-units`): per 100 g for `unit = '100g'`, per 1 piece /
 * litre / cup / tbsp otherwise. Figures come from USDA FoodData Central
 * (https://fdc.nal.usda.gov) — SR Legacy and Foundation Foods — and the
 * portion weights come from the same records' `foodPortions`.
 *
 * The following representative sample was re-verified against the live FDC API
 * (`https://api.nal.usda.gov/fdc/v1/foods?fdcIds=…`, nutrient numbers 203/204/
 * 205/208) while writing this file. Human-readable page for any row:
 * `https://fdc.nal.usda.gov/food-details/<fdcId>/nutrients`.
 *
 *   fdcId   food                                        kcal  prot  carb   fat
 *   170379  Broccoli, raw                                 34  2.82   6.64  0.37
 *   168462  Spinach, raw                                  23  2.86   3.63  0.39
 *   170393  Carrots, raw                                  41  0.93   9.58  0.24
 *   168482  Sweet potato, raw                             86  1.57  20.12  0.05
 *   170026  Potatoes, flesh and skin, raw                 77  2.05  17.49  0.09
 *   173944  Bananas, raw                                  89  1.09  22.84  0.33
 *   171688  Apples, raw, with skin                        52  0.26  13.81  0.17
 *   171711  Blueberries, raw                              57  0.74  14.49  0.33
 *   167762  Strawberries, raw                             32  0.67   7.68  0.30
 *   171705  Avocados, raw                                160  2.00   8.53 14.66
 *   168878  Rice, white, long-grain, enriched, cooked     130  2.69  28.17  0.28
 *   169704  Rice, brown, long-grain, cooked               123  2.74  25.58  0.97
 *   169705  Oats, raw (rolled)                           389 16.89  66.27  6.90
 *   168917  Quinoa, cooked                               120  4.40  21.30  1.92
 *   172688  Bread, whole-wheat, commercially prepared    252 12.40  42.70  3.50
 *   172421  Lentils, cooked, boiled, no salt             116  9.02  20.13  0.38
 *   173757  Chickpeas, cooked, boiled, no salt           164  8.86  27.42  2.59
 *   173735  Beans, black, cooked, boiled, no salt        132  8.86  23.71  0.54
 *   171477  Chicken, breast, meat only, cooked, roasted  165 31.02   0     3.57
 *   174031  Beef, ground, 90/10, patty, cooked, broiled  217 26.10   0    11.80
 *   175168  Fish, salmon, Atlantic, farmed, cooked       206 22.10   0    12.35
 *   171986  Fish, tuna, light, canned in water, drained  116 25.51   0     0.82
 *   171971  Crustaceans, shrimp, cooked, moist heat      119 22.80   1.52  1.70
 *   171287  Egg, whole, raw, fresh                       143 12.56   0.72  9.51
 *   330137  Yogurt, Greek, plain, nonfat                  61 10.30   3.64  0.37
 *   171265  Milk, whole, 3.25% milkfat, with vitamin D    61  3.15   4.80  3.25
 *   328637  Cheese, cheddar                              408 23.30   2.44 34.00
 *   170567  Nuts, almonds                                579 21.15  21.55 49.93
 *   172470  Peanut butter, smooth, without salt          598 22.20  22.30 51.40
 *   171413  Oil, olive, salad or cooking                 884  0      0   100
 *   328841  Cheese, cottage, lowfat, 2% milkfat           84 11.00   4.31  2.30
 *   172475  Tofu, raw, firm, prepared with calcium sulf. 144 17.30   2.78  8.72
 *   169640  Honey                                        304  0.30  82.40  0
 *   169098  Orange juice, raw                             45  0.70  10.40  0.20
 *
 * Portion weights verified from the same records: large egg 50 g, medium
 * banana 118 g, medium apple 182 g, slice of whole-wheat bread 32 g, 1 cup milk
 * 244 g (1 L = 1030 g), 1 tbsp olive oil 13.5 g, 1 tbsp peanut butter 16 g,
 * 1 tbsp honey 21 g, 1 cup cooked white rice 158 g, medium orange 131 g,
 * medium carrot 61 g, medium potato 213 g, medium sweet potato 130 g, medium
 * avocado 201 g.
 *
 * Two known ambiguities in the source data, resolved deliberately here:
 * - **Canned light tuna.** Foundation 334194 reports 90 kcal / 19.0 g protein;
 *   SR Legacy 171986 reports 116 kcal / 25.5 g protein for the same nominal
 *   food. This file uses the SR Legacy figures, which match commercial can
 *   labels more closely.
 * - **Firm tofu.** Firm with calcium sulfate (172475) is 144 kcal / 17.3 g
 *   protein; extra-firm with nigari (174290) is 83 kcal / 9.98 g. Both are
 *   seeded, named after their coagulant, so neither is silently assumed.
 *
 * Rows outside the verified sample come from the same two USDA datasets
 * (SR Legacy and Foundation Foods) at the same per-100 g basis.
 *
 * ---------------------------------------------------------------------------
 * NOTES FOR MAINTAINERS
 * ---------------------------------------------------------------------------
 * - `better-auth/crypto` is resolved from the workspace root rather than from
 *   `@brnit/db`'s own dependencies. Passwords must be hashed with Better
 *   Auth's own scrypt or the seeded users cannot sign in, and `auth.api
 *   .signUpEmail` is unusable here because `sendOnSignUp` is on and the mailer
 *   throws without SMTP.
 * - Bare `numeric` columns surface as `string` in Drizzle, so every macro,
 *   quantity and measurement below is written as a string literal.
 * - `meal.total_*` are application-maintained aggregates with no trigger; they
 *   are computed through `computeMealTotalsFromLineItems`, the same function
 *   the API uses, so the seeded totals cannot disagree with the app's.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";

import type { FoodUnit } from "@brnit/domain";
import { hashPassword } from "better-auth/crypto";
import dotenv from "dotenv";
import type { Column, SQL } from "drizzle-orm";
import { and, inArray, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgTable } from "drizzle-orm/pg-core";

import {
	computeMealTotalsFromLineItems,
	mealMacroTotalsToMealColumns,
} from "./meal-totals";
import { account, member, organization, user } from "./schema/auth";
import { bodyCompositionAssessment } from "./schema/body-composition-assessment";
import {
	dietPlan,
	dietPlanAssignment,
	dietPlanMeal,
	dietPlanMealConsumption,
	dietPlanMealConsumptionItem,
	dietPlanMealItemOverride,
} from "./schema/diet-plan";
import { foodCategory } from "./schema/food-category";
import { foodItemCategory } from "./schema/food-item-category";
import { foodItem } from "./schema/food-item-table";
import { meal, mealItem } from "./schema/meal";

/**
 * Paths are relative to the package directory (bun's cwd for the db scripts),
 * mirroring `seed.ts`. In a deploy neither file exists and the real
 * environment wins.
 */
const ENV_CANDIDATES = ["../../apps/server/.env", "../../.env"];
const envPath = ENV_CANDIDATES.find((candidate) => existsSync(candidate));
if (envPath) {
	dotenv.config({ path: envPath });
}

// ---------------------------------------------------------------------------
// Deterministic identity
// ---------------------------------------------------------------------------

/**
 * Namespace for every id this file mints. Changing it orphans the previous
 * demo dataset instead of updating it, so don't.
 */
const DEMO_ID_NAMESPACE = "brnit.demo-seed.v1";

const UUID_VARIANT_BASE = 0x80;
const UUID_VARIANT_MASK = 0x40;
const HEX_RADIX = 16;

/**
 * A stable UUIDv5-shaped id for `(kind, key)`.
 *
 * Every primary key in this schema is `text`, so the format is cosmetic — what
 * matters is that the same logical row always resolves to the same id, which
 * is what makes every insert below an upsert rather than a duplicate. Written
 * without bitwise operators because the lint preset forbids them.
 */
function demoId(kind: string, key: string): string {
	const hash = createHash("sha1")
		.update(`${DEMO_ID_NAMESPACE}:${kind}:${key}`)
		.digest("hex");
	const version = `5${hash.slice(13, 16)}`;
	const variantByte =
		UUID_VARIANT_BASE +
		(Number.parseInt(hash.slice(16, 18), HEX_RADIX) % UUID_VARIANT_MASK);
	const variant = `${variantByte.toString(HEX_RADIX)}${hash.slice(18, 20)}`;
	return [
		hash.slice(0, 8),
		hash.slice(8, 12),
		version,
		variant,
		hash.slice(20, 32),
	].join("-");
}

// ---------------------------------------------------------------------------
// UTC date helpers
//
// Every date in this app is UTC: `date` columns are 'YYYY-MM-DD' strings and
// `timestamp` columns are without time zone. `@brnit/datetime` owns these
// rules at runtime, but it is not a dependency of `@brnit/db`, so the three
// lines this script needs live here rather than widening the package graph.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;
const ISO_DATE_LENGTH = 10;

const TODAY_UTC = (() => {
	const now = new Date();
	return new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
	);
})();

function addDays(base: Date, days: number): Date {
	return new Date(base.getTime() + days * MS_PER_DAY);
}

/** `'YYYY-MM-DD'`, the wire format of every `date` column here. */
function dateString(value: Date): string {
	return value.toISOString().slice(0, ISO_DATE_LENGTH);
}

/** `dateString` for "n days from today", negative for the past. */
function dayOffset(days: number): string {
	return dateString(addDays(TODAY_UTC, days));
}

/** A UTC timestamp at `hour:minute` on the day `days` from today. */
function timestampAt(days: number, hour: number, minute = 0): Date {
	return new Date(
		addDays(TODAY_UTC, days).getTime() + (hour * 60 + minute) * 60_000
	);
}

/** Inclusive `'YYYY-MM-DD'` range, the shape `effective_dates` stores. */
function dateRange(fromDays: number, toDays: number): string[] {
	const dates: string[] = [];
	for (let offset = fromDays; offset <= toDays; offset += 1) {
		dates.push(dayOffset(offset));
	}
	return dates;
}

// ===========================================================================
// DATA TABLES
//
// Everything below the line is literal demo data. The insert logic starts at
// "SEEDING STEPS". Keys are stable strings: they feed `demoId`, so renaming a
// key mints a new row rather than updating the existing one.
// ===========================================================================

const CAT_VEGETABLES = "Vegetables";
const CAT_FRUITS = "Fruits";
const CAT_GRAINS = "Grains & Cereals";
const CAT_LEGUMES = "Legumes";
const CAT_MEAT = "Meat & Poultry";
const CAT_FISH = "Fish & Seafood";
const CAT_DAIRY = "Dairy & Eggs";
const CAT_NUTS = "Nuts & Seeds";
const CAT_OILS = "Oils & Fats";
const CAT_BEVERAGES = "Beverages";
const CAT_PREPARED = "Prepared Dishes";
const CAT_PANTRY = "Sweeteners & Condiments";

const FOOD_CATEGORIES: ReadonlyArray<{ description: string; name: string }> = [
	{ name: CAT_VEGETABLES, description: "Fresh and cooked vegetables." },
	{ name: CAT_FRUITS, description: "Fresh and dried fruit." },
	{ name: CAT_GRAINS, description: "Rice, breads, pasta and cereals." },
	{ name: CAT_LEGUMES, description: "Beans, lentils, peas and soy foods." },
	{ name: CAT_MEAT, description: "Red meat, poultry and cured meats." },
	{ name: CAT_FISH, description: "Finfish, shellfish and canned seafood." },
	{ name: CAT_DAIRY, description: "Milk, yoghurt, cheese and eggs." },
	{ name: CAT_NUTS, description: "Tree nuts, peanuts, seeds and nut butters." },
	{ name: CAT_OILS, description: "Cooking oils and other added fats." },
	{ name: CAT_BEVERAGES, description: "Drinks measured by volume." },
	{ name: CAT_PREPARED, description: "Composite dishes ready to eat." },
	{ name: CAT_PANTRY, description: "Sweeteners, spreads and condiments." },
];

interface SeedFood {
	calories: string;
	carbs: string;
	categories: readonly string[];
	fat: string;
	gramsPerUnit: string;
	key: string;
	name: string;
	protein: string;
	unit: FoodUnit;
}

/** Macros in column order, per one unit: `[calories, protein, carbs, fat]`. */
type Macros = readonly [string, string, string, string];

/**
 * One catalogue row. `unit` defaults to `'100g'` with `gramsPerUnit = '100'`,
 * which is the only combination where `quantity` means grams; for every other
 * unit the macros are per 1 of that unit and `gramsPerUnit` is the weight of
 * one, which the alternatives endpoint needs to compare across units.
 */
function food(
	key: string,
	name: string,
	macros: Macros,
	categories: readonly string[],
	unit: FoodUnit = "100g",
	gramsPerUnit = "100"
): SeedFood {
	const [calories, protein, carbs, fat] = macros;
	return {
		calories,
		carbs,
		categories,
		fat,
		gramsPerUnit,
		key,
		name,
		protein,
		unit,
	};
}

const VEGETABLE_FOODS: readonly SeedFood[] = [
	food(
		"broccoli-raw",
		"Broccoli, raw",
		["34", "2.82", "6.64", "0.37"],
		[CAT_VEGETABLES]
	),
	food(
		"broccoli-cooked",
		"Broccoli, cooked, boiled, drained",
		["35", "2.38", "7.18", "0.41"],
		[CAT_VEGETABLES]
	),
	food(
		"spinach-raw",
		"Spinach, raw",
		["23", "2.86", "3.63", "0.39"],
		[CAT_VEGETABLES]
	),
	food(
		"spinach-cooked",
		"Spinach, cooked, boiled, drained",
		["23", "2.97", "3.75", "0.26"],
		[CAT_VEGETABLES]
	),
	food(
		"kale-raw",
		"Kale, raw",
		["35", "2.92", "4.42", "1.49"],
		[CAT_VEGETABLES]
	),
	food(
		"arugula-raw",
		"Arugula (rocket), raw",
		["25", "2.58", "3.65", "0.66"],
		[CAT_VEGETABLES]
	),
	food(
		"swiss-chard-raw",
		"Chard, Swiss, raw",
		["19", "1.80", "3.74", "0.20"],
		[CAT_VEGETABLES]
	),
	food(
		"lettuce-romaine",
		"Lettuce, cos or romaine, raw",
		["17", "1.23", "3.29", "0.30"],
		[CAT_VEGETABLES]
	),
	food(
		"cabbage-raw",
		"Cabbage, raw",
		["25", "1.28", "5.80", "0.10"],
		[CAT_VEGETABLES]
	),
	food(
		"cabbage-red-raw",
		"Cabbage, red, raw",
		["31", "1.43", "7.37", "0.16"],
		[CAT_VEGETABLES]
	),
	food(
		"brussels-sprouts-raw",
		"Brussels sprouts, raw",
		["43", "3.38", "8.95", "0.30"],
		[CAT_VEGETABLES]
	),
	food(
		"cauliflower-raw",
		"Cauliflower, raw",
		["25", "1.92", "4.97", "0.28"],
		[CAT_VEGETABLES]
	),
	food(
		"carrot-raw",
		"Carrots, raw",
		["41", "0.93", "9.58", "0.24"],
		[CAT_VEGETABLES]
	),
	food(
		"carrot-piece",
		"Carrot, medium, raw (61 g)",
		["25.01", "0.57", "5.84", "0.15"],
		[CAT_VEGETABLES],
		"piece",
		"61"
	),
	food(
		"tomato-raw",
		"Tomatoes, red, ripe, raw",
		["18", "0.88", "3.89", "0.20"],
		[CAT_VEGETABLES]
	),
	food(
		"cucumber-raw",
		"Cucumber, with peel, raw",
		["15", "0.65", "3.63", "0.11"],
		[CAT_VEGETABLES]
	),
	food(
		"pepper-red-raw",
		"Peppers, sweet, red, raw",
		["31", "0.99", "6.03", "0.30"],
		[CAT_VEGETABLES]
	),
	food(
		"pepper-green-raw",
		"Peppers, sweet, green, raw",
		["20", "0.86", "4.64", "0.17"],
		[CAT_VEGETABLES]
	),
	food(
		"onion-raw",
		"Onions, raw",
		["40", "1.10", "9.34", "0.10"],
		[CAT_VEGETABLES]
	),
	food(
		"spring-onion-raw",
		"Onions, spring or scallions, raw",
		["32", "1.83", "7.34", "0.19"],
		[CAT_VEGETABLES]
	),
	food(
		"leek-raw",
		"Leeks, raw",
		["61", "1.50", "14.15", "0.30"],
		[CAT_VEGETABLES]
	),
	food(
		"garlic-raw",
		"Garlic, raw",
		["149", "6.36", "33.06", "0.50"],
		[CAT_VEGETABLES]
	),
	food(
		"potato-raw",
		"Potatoes, flesh and skin, raw",
		["77", "2.05", "17.49", "0.09"],
		[CAT_VEGETABLES]
	),
	food(
		"potato-baked",
		"Potato, baked, flesh and skin",
		["93", "2.50", "21.15", "0.13"],
		[CAT_VEGETABLES]
	),
	food(
		"sweet-potato-raw",
		"Sweet potato, raw, unprepared",
		["86", "1.57", "20.12", "0.05"],
		[CAT_VEGETABLES]
	),
	food(
		"sweet-potato-baked",
		"Sweet potato, cooked, baked in skin",
		["90", "2.01", "20.71", "0.15"],
		[CAT_VEGETABLES]
	),
	food(
		"sweet-potato-piece",
		"Sweet potato, medium, raw (130 g)",
		["111.80", "2.04", "26.16", "0.07"],
		[CAT_VEGETABLES],
		"piece",
		"130"
	),
	food(
		"zucchini-raw",
		"Squash, summer, zucchini, raw",
		["17", "1.21", "3.11", "0.32"],
		[CAT_VEGETABLES]
	),
	food(
		"butternut-squash-raw",
		"Squash, winter, butternut, raw",
		["45", "1.00", "11.69", "0.10"],
		[CAT_VEGETABLES]
	),
	food(
		"pumpkin-raw",
		"Pumpkin, raw",
		["26", "1.00", "6.50", "0.10"],
		[CAT_VEGETABLES]
	),
	food(
		"eggplant-raw",
		"Eggplant, raw",
		["25", "0.98", "5.88", "0.18"],
		[CAT_VEGETABLES]
	),
	food(
		"green-beans-raw",
		"Beans, snap, green, raw",
		["31", "1.83", "6.97", "0.22"],
		[CAT_VEGETABLES]
	),
	food(
		"asparagus-raw",
		"Asparagus, raw",
		["20", "2.20", "3.88", "0.12"],
		[CAT_VEGETABLES]
	),
	food(
		"celery-raw",
		"Celery, raw",
		["14", "0.69", "2.97", "0.17"],
		[CAT_VEGETABLES]
	),
	food(
		"mushroom-white-raw",
		"Mushrooms, white, raw",
		["22", "3.09", "3.26", "0.34"],
		[CAT_VEGETABLES]
	),
	food(
		"beetroot-raw",
		"Beets, raw",
		["43", "1.61", "9.56", "0.17"],
		[CAT_VEGETABLES]
	),
	food(
		"radish-raw",
		"Radishes, raw",
		["16", "0.68", "3.40", "0.10"],
		[CAT_VEGETABLES]
	),
	food(
		"turnip-raw",
		"Turnips, raw",
		["28", "0.90", "6.43", "0.10"],
		[CAT_VEGETABLES]
	),
	food(
		"okra-raw",
		"Okra, raw",
		["33", "1.93", "7.45", "0.19"],
		[CAT_VEGETABLES]
	),
	food(
		"artichoke-raw",
		"Artichokes, globe or French, raw",
		["47", "3.27", "10.51", "0.15"],
		[CAT_VEGETABLES]
	),
	food(
		"sweet-corn-raw",
		"Corn, sweet, yellow, raw",
		["86", "3.27", "18.70", "1.35"],
		[CAT_VEGETABLES]
	),
	food(
		"spinach-cup",
		"Spinach, raw, 1 cup (30 g)",
		["6.90", "0.86", "1.09", "0.12"],
		[CAT_VEGETABLES],
		"cup",
		"30"
	),
];

const FRUIT_FOODS: readonly SeedFood[] = [
	food(
		"banana-raw",
		"Bananas, raw",
		["89", "1.09", "22.84", "0.33"],
		[CAT_FRUITS]
	),
	food(
		"banana-piece",
		"Banana, medium, raw (118 g)",
		["105.02", "1.29", "26.95", "0.39"],
		[CAT_FRUITS],
		"piece",
		"118"
	),
	food(
		"apple-raw",
		"Apples, raw, with skin",
		["52", "0.26", "13.81", "0.17"],
		[CAT_FRUITS]
	),
	food(
		"apple-piece",
		"Apple, medium, raw with skin (182 g)",
		["94.64", "0.47", "25.13", "0.31"],
		[CAT_FRUITS],
		"piece",
		"182"
	),
	food(
		"orange-raw",
		"Oranges, raw, all commercial varieties",
		["47", "0.94", "11.75", "0.12"],
		[CAT_FRUITS]
	),
	food(
		"orange-piece",
		"Orange, medium, raw (131 g)",
		["61.57", "1.23", "15.39", "0.16"],
		[CAT_FRUITS],
		"piece",
		"131"
	),
	food(
		"strawberry-raw",
		"Strawberries, raw",
		["32", "0.67", "7.68", "0.30"],
		[CAT_FRUITS]
	),
	food(
		"blueberry-raw",
		"Blueberries, raw",
		["57", "0.74", "14.49", "0.33"],
		[CAT_FRUITS]
	),
	food(
		"raspberry-raw",
		"Raspberries, raw",
		["52", "1.20", "11.94", "0.65"],
		[CAT_FRUITS]
	),
	food(
		"blackberry-raw",
		"Blackberries, raw",
		["43", "1.39", "9.61", "0.49"],
		[CAT_FRUITS]
	),
	food(
		"cherry-sweet-raw",
		"Cherries, sweet, raw",
		["63", "1.06", "16.01", "0.20"],
		[CAT_FRUITS]
	),
	food(
		"grapes-raw",
		"Grapes, red or green, raw",
		["69", "0.72", "18.10", "0.16"],
		[CAT_FRUITS]
	),
	food(
		"watermelon-raw",
		"Watermelon, raw",
		["30", "0.61", "7.55", "0.15"],
		[CAT_FRUITS]
	),
	food(
		"cantaloupe-raw",
		"Melons, cantaloupe, raw",
		["34", "0.84", "8.16", "0.19"],
		[CAT_FRUITS]
	),
	food(
		"mango-raw",
		"Mangos, raw",
		["60", "0.82", "14.98", "0.38"],
		[CAT_FRUITS]
	),
	food(
		"pineapple-raw",
		"Pineapple, raw, all varieties",
		["50", "0.54", "13.12", "0.12"],
		[CAT_FRUITS]
	),
	food(
		"papaya-raw",
		"Papayas, raw",
		["43", "0.47", "10.82", "0.26"],
		[CAT_FRUITS]
	),
	food(
		"kiwi-raw",
		"Kiwifruit, green, raw",
		["61", "1.14", "14.66", "0.52"],
		[CAT_FRUITS]
	),
	food(
		"peach-raw",
		"Peaches, raw",
		["39", "0.91", "9.54", "0.25"],
		[CAT_FRUITS]
	),
	food("pear-raw", "Pears, raw", ["57", "0.36", "15.23", "0.14"], [CAT_FRUITS]),
	food("plum-raw", "Plums, raw", ["46", "0.70", "11.42", "0.28"], [CAT_FRUITS]),
	food(
		"apricot-raw",
		"Apricots, raw",
		["48", "1.40", "11.12", "0.39"],
		[CAT_FRUITS]
	),
	food(
		"grapefruit-raw",
		"Grapefruit, raw, pink and red",
		["42", "0.77", "10.66", "0.14"],
		[CAT_FRUITS]
	),
	food(
		"lemon-raw",
		"Lemons, raw, without peel",
		["29", "1.10", "9.32", "0.30"],
		[CAT_FRUITS]
	),
	food(
		"pomegranate-raw",
		"Pomegranate, raw",
		["83", "1.67", "18.70", "1.17"],
		[CAT_FRUITS]
	),
	food("fig-raw", "Figs, raw", ["74", "0.75", "19.18", "0.30"], [CAT_FRUITS]),
	food(
		"guava-raw",
		"Guavas, common, raw",
		["68", "2.55", "14.32", "0.95"],
		[CAT_FRUITS]
	),
	food(
		"avocado-raw",
		"Avocados, raw, all commercial varieties",
		["160", "2.00", "8.53", "14.66"],
		[CAT_FRUITS]
	),
	food(
		"avocado-piece",
		"Avocado, medium, raw (201 g)",
		["321.60", "4.02", "17.15", "29.47"],
		[CAT_FRUITS],
		"piece",
		"201"
	),
	food(
		"date-medjool",
		"Dates, medjool",
		["277", "1.81", "74.97", "0.15"],
		[CAT_FRUITS]
	),
	food(
		"date-piece",
		"Date, medjool, pitted (24 g)",
		["66.48", "0.43", "17.99", "0.04"],
		[CAT_FRUITS],
		"piece",
		"24"
	),
	food(
		"raisins-seedless",
		"Raisins, seedless",
		["299", "3.07", "79.18", "0.46"],
		[CAT_FRUITS]
	),
	food(
		"apricot-dried",
		"Apricots, dried, sulfured, uncooked",
		["241", "3.39", "62.64", "0.51"],
		[CAT_FRUITS]
	),
	food(
		"cranberry-dried",
		"Cranberries, dried, sweetened",
		["308", "0.17", "82.80", "1.37"],
		[CAT_FRUITS]
	),
	food(
		"coconut-meat-raw",
		"Nuts, coconut meat, raw",
		["354", "3.33", "15.23", "33.49"],
		[CAT_FRUITS, CAT_NUTS]
	),
];

const GRAIN_FOODS: readonly SeedFood[] = [
	food(
		"white-rice-cooked",
		"Rice, white, long-grain, enriched, cooked",
		["130", "2.69", "28.17", "0.28"],
		[CAT_GRAINS]
	),
	food(
		"white-rice-cup",
		"Rice, white, cooked, 1 cup (158 g)",
		["205.40", "4.25", "44.51", "0.44"],
		[CAT_GRAINS],
		"cup",
		"158"
	),
	food(
		"brown-rice-cooked",
		"Rice, brown, long-grain, cooked",
		["123", "2.74", "25.58", "0.97"],
		[CAT_GRAINS]
	),
	food(
		"parboiled-rice-cooked",
		"Rice, white, long-grain, parboiled, enriched, cooked",
		["123", "2.91", "26.05", "0.37"],
		[CAT_GRAINS]
	),
	food(
		"oats-dry",
		"Oats, raw (rolled)",
		["389", "16.89", "66.27", "6.90"],
		[CAT_GRAINS]
	),
	food(
		"oats-cup",
		"Oats, raw, 1 cup (81 g)",
		["315.09", "13.68", "53.68", "5.59"],
		[CAT_GRAINS],
		"cup",
		"81"
	),
	food(
		"quinoa-cooked",
		"Quinoa, cooked",
		["120", "4.40", "21.30", "1.92"],
		[CAT_GRAINS]
	),
	food(
		"bulgur-cooked",
		"Bulgur, cooked",
		["83", "3.08", "18.58", "0.24"],
		[CAT_GRAINS]
	),
	food(
		"couscous-cooked",
		"Couscous, cooked",
		["112", "3.79", "23.22", "0.16"],
		[CAT_GRAINS]
	),
	food(
		"barley-cooked",
		"Barley, pearled, cooked",
		["123", "2.26", "28.22", "0.44"],
		[CAT_GRAINS]
	),
	food(
		"millet-cooked",
		"Millet, cooked",
		["119", "3.51", "23.67", "1.00"],
		[CAT_GRAINS]
	),
	food(
		"buckwheat-cooked",
		"Buckwheat groats, roasted, cooked",
		["92", "3.38", "19.94", "0.62"],
		[CAT_GRAINS]
	),
	food(
		"spelt-cooked",
		"Spelt, cooked",
		["127", "5.50", "26.44", "0.85"],
		[CAT_GRAINS]
	),
	food(
		"pasta-cooked",
		"Pasta, cooked, enriched",
		["158", "5.80", "30.86", "0.93"],
		[CAT_GRAINS]
	),
	food(
		"pasta-wholewheat-cooked",
		"Pasta, whole-wheat, cooked",
		["124", "5.33", "26.54", "0.54"],
		[CAT_GRAINS]
	),
	food(
		"wholewheat-bread",
		"Bread, whole-wheat, commercially prepared",
		["252", "12.40", "42.70", "3.50"],
		[CAT_GRAINS]
	),
	food(
		"wholewheat-bread-slice",
		"Bread, whole-wheat, 1 slice (32 g)",
		["80.64", "3.97", "13.66", "1.12"],
		[CAT_GRAINS],
		"piece",
		"32"
	),
	food(
		"white-bread",
		"Bread, white, commercially prepared",
		["266", "7.64", "50.61", "3.29"],
		[CAT_GRAINS]
	),
	food(
		"white-bread-slice",
		"Bread, white, 1 slice (25 g)",
		["66.50", "1.91", "12.65", "0.82"],
		[CAT_GRAINS],
		"piece",
		"25"
	),
	food(
		"rye-bread",
		"Bread, rye",
		["259", "8.50", "48.30", "3.30"],
		[CAT_GRAINS]
	),
	food(
		"sourdough-bread",
		"Bread, French or Vienna (includes sourdough)",
		["274", "8.83", "51.90", "2.60"],
		[CAT_GRAINS]
	),
	food(
		"pita-bread",
		"Bread, pita, white, enriched",
		["275", "9.10", "55.70", "1.20"],
		[CAT_GRAINS]
	),
	food(
		"pita-piece",
		"Bread, pita, white, 1 large (60 g)",
		["165", "5.46", "33.42", "0.72"],
		[CAT_GRAINS],
		"piece",
		"60"
	),
	food(
		"flour-tortilla-piece",
		"Tortilla, flour, 1 medium (45 g)",
		["137.70", "3.69", "23.13", "3.20"],
		[CAT_GRAINS],
		"piece",
		"45"
	),
	food(
		"corn-tortilla-piece",
		"Tortilla, corn, 1 medium (26 g)",
		["56.68", "1.48", "11.60", "0.74"],
		[CAT_GRAINS],
		"piece",
		"26"
	),
	food(
		"rice-cake-piece",
		"Rice cake, brown rice, plain, 1 cake (9 g)",
		["34.83", "0.74", "7.34", "0.25"],
		[CAT_GRAINS],
		"piece",
		"9"
	),
	food(
		"cornflakes",
		"Cereals ready-to-eat, corn flakes",
		["357", "7.50", "84.10", "0.40"],
		[CAT_GRAINS]
	),
	food(
		"granola",
		"Granola, homemade",
		["489", "13.67", "53.88", "24.31"],
		[CAT_GRAINS, CAT_NUTS]
	),
	food(
		"popcorn-air-popped",
		"Snacks, popcorn, air-popped",
		["387", "12.94", "77.78", "4.54"],
		[CAT_GRAINS]
	),
	food(
		"cornmeal-yellow",
		"Cornmeal, degermed, enriched, yellow",
		["370", "8.12", "79.45", "1.75"],
		[CAT_GRAINS]
	),
	food(
		"flour-white",
		"Wheat flour, white, all-purpose, enriched",
		["364", "10.33", "76.31", "0.98"],
		[CAT_GRAINS]
	),
	food(
		"flour-wholewheat",
		"Wheat flour, whole-grain",
		["340", "13.21", "71.97", "2.50"],
		[CAT_GRAINS]
	),
];

const LEGUME_FOODS: readonly SeedFood[] = [
	food(
		"lentils-cooked",
		"Lentils, mature seeds, cooked, boiled, without salt",
		["116", "9.02", "20.13", "0.38"],
		[CAT_LEGUMES]
	),
	food(
		"lentils-cup",
		"Lentils, cooked, 1 cup (198 g)",
		["229.68", "17.86", "39.86", "0.75"],
		[CAT_LEGUMES],
		"cup",
		"198"
	),
	food(
		"chickpeas-cooked",
		"Chickpeas (garbanzo), mature seeds, cooked",
		["164", "8.86", "27.42", "2.59"],
		[CAT_LEGUMES]
	),
	food(
		"black-beans-cooked",
		"Beans, black, mature seeds, cooked",
		["132", "8.86", "23.71", "0.54"],
		[CAT_LEGUMES]
	),
	food(
		"kidney-beans-cooked",
		"Beans, kidney, red, mature seeds, cooked",
		["127", "8.67", "22.80", "0.50"],
		[CAT_LEGUMES]
	),
	food(
		"pinto-beans-cooked",
		"Beans, pinto, mature seeds, cooked",
		["143", "9.01", "26.22", "0.65"],
		[CAT_LEGUMES]
	),
	food(
		"white-beans-cooked",
		"Beans, white, mature seeds, cooked",
		["139", "9.73", "25.09", "0.35"],
		[CAT_LEGUMES]
	),
	food(
		"fava-beans-cooked",
		"Broad beans (fava), mature seeds, cooked",
		["110", "7.60", "19.65", "0.40"],
		[CAT_LEGUMES]
	),
	food(
		"split-peas-cooked",
		"Peas, split, mature seeds, cooked",
		["118", "8.34", "21.10", "0.39"],
		[CAT_LEGUMES]
	),
	food(
		"green-peas-raw",
		"Peas, green, raw",
		["81", "5.42", "14.45", "0.40"],
		[CAT_LEGUMES, CAT_VEGETABLES]
	),
	food(
		"green-peas-cooked",
		"Peas, green, cooked, boiled, drained",
		["84", "5.36", "15.63", "0.22"],
		[CAT_LEGUMES, CAT_VEGETABLES]
	),
	food(
		"soybeans-cooked",
		"Soybeans, mature seeds, cooked, boiled",
		["172", "18.21", "8.36", "8.97"],
		[CAT_LEGUMES]
	),
	food(
		"edamame-cooked",
		"Edamame, frozen, prepared",
		["121", "11.91", "8.91", "5.20"],
		[CAT_LEGUMES]
	),
	food(
		"tofu-firm-calcium",
		"Tofu, raw, firm, prepared with calcium sulfate",
		["144", "17.30", "2.78", "8.72"],
		[CAT_LEGUMES]
	),
	food(
		"tofu-extrafirm-nigari",
		"Tofu, extra firm, prepared with nigari",
		["83", "9.98", "1.18", "5.26"],
		[CAT_LEGUMES]
	),
	food("tempeh", "Tempeh", ["192", "20.29", "7.64", "10.80"], [CAT_LEGUMES]),
	food(
		"hummus-commercial",
		"Hummus, commercial",
		["229", "7.35", "19.96", "13.63"],
		[CAT_LEGUMES, CAT_PREPARED]
	),
];

const MEAT_FOODS: readonly SeedFood[] = [
	food(
		"chicken-breast-cooked",
		"Chicken, breast, meat only, cooked, roasted",
		["165", "31.02", "0", "3.57"],
		[CAT_MEAT]
	),
	food(
		"chicken-breast-raw",
		"Chicken, breast, boneless skinless, raw",
		["120", "22.50", "0", "2.62"],
		[CAT_MEAT]
	),
	food(
		"chicken-thigh-cooked",
		"Chicken, thigh, meat only, cooked, roasted",
		["209", "25.94", "0", "10.88"],
		[CAT_MEAT]
	),
	food(
		"chicken-drumstick-cooked",
		"Chicken, drumstick, meat only, cooked, roasted",
		["172", "28.30", "0", "5.70"],
		[CAT_MEAT]
	),
	food(
		"turkey-breast-cooked",
		"Turkey, breast, meat only, roasted",
		["135", "30.13", "0", "0.74"],
		[CAT_MEAT]
	),
	food(
		"turkey-ground-cooked",
		"Turkey, ground, 93% lean, cooked",
		["203", "27.37", "0", "9.71"],
		[CAT_MEAT]
	),
	food(
		"beef-ground-90-cooked",
		"Beef, ground, 90% lean / 10% fat, cooked",
		["217", "26.10", "0", "11.80"],
		[CAT_MEAT]
	),
	food(
		"beef-ground-95-cooked",
		"Beef, ground, 95% lean / 5% fat, cooked",
		["174", "25.63", "0", "7.26"],
		[CAT_MEAT]
	),
	food(
		"beef-sirloin-cooked",
		"Beef, top sirloin, lean only, cooked, broiled",
		["201", "30.24", "0", "7.86"],
		[CAT_MEAT]
	),
	food(
		"beef-liver-cooked",
		"Beef, liver, cooked, braised",
		["191", "29.08", "5.14", "5.26"],
		[CAT_MEAT]
	),
	food(
		"lamb-leg-cooked",
		"Lamb, leg, lean only, cooked, roasted",
		["191", "28.30", "0", "7.74"],
		[CAT_MEAT]
	),
	food(
		"pork-loin-cooked",
		"Pork, loin, lean only, cooked, roasted",
		["201", "28.60", "0", "8.70"],
		[CAT_MEAT]
	),
	food(
		"bacon-cooked",
		"Pork, bacon, cooked, pan-fried",
		["541", "37.04", "1.43", "41.78"],
		[CAT_MEAT]
	),
	food(
		"ham-extralean",
		"Ham, sliced, extra lean",
		["107", "16.60", "1.50", "3.60"],
		[CAT_MEAT]
	),
];

const FISH_FOODS: readonly SeedFood[] = [
	food(
		"salmon-cooked",
		"Fish, salmon, Atlantic, farmed, cooked, dry heat",
		["206", "22.10", "0", "12.35"],
		[CAT_FISH]
	),
	food(
		"salmon-raw",
		"Fish, salmon, Atlantic, farmed, raw",
		["208", "20.42", "0", "13.42"],
		[CAT_FISH]
	),
	food(
		"tuna-canned-water",
		"Fish, tuna, light, canned in water, drained",
		["116", "25.51", "0", "0.82"],
		[CAT_FISH]
	),
	food(
		"tuna-yellowfin-raw",
		"Fish, tuna, yellowfin, fresh, raw",
		["109", "24.40", "0", "0.49"],
		[CAT_FISH]
	),
	food(
		"cod-cooked",
		"Fish, cod, Atlantic, cooked, dry heat",
		["105", "22.83", "0", "0.86"],
		[CAT_FISH]
	),
	food(
		"tilapia-cooked",
		"Fish, tilapia, cooked, dry heat",
		["128", "26.15", "0", "2.65"],
		[CAT_FISH]
	),
	food(
		"seabass-cooked",
		"Fish, sea bass, mixed species, cooked, dry heat",
		["124", "23.63", "0", "2.56"],
		[CAT_FISH]
	),
	food(
		"trout-cooked",
		"Fish, trout, rainbow, farmed, cooked, dry heat",
		["168", "23.80", "0", "7.24"],
		[CAT_FISH]
	),
	food(
		"mackerel-cooked",
		"Fish, mackerel, Atlantic, cooked, dry heat",
		["262", "23.85", "0", "17.81"],
		[CAT_FISH]
	),
	food(
		"sardines-canned-oil",
		"Fish, sardine, Atlantic, canned in oil, drained",
		["208", "24.62", "0", "11.45"],
		[CAT_FISH]
	),
	food(
		"shrimp-cooked",
		"Crustaceans, shrimp, mixed species, cooked, moist heat",
		["119", "22.80", "1.52", "1.70"],
		[CAT_FISH]
	),
	food(
		"crab-cooked",
		"Crustaceans, crab, blue, cooked, moist heat",
		["97", "19.35", "0.04", "1.55"],
		[CAT_FISH]
	),
	food(
		"mussels-cooked",
		"Mollusks, mussel, blue, cooked, moist heat",
		["172", "23.80", "7.39", "4.48"],
		[CAT_FISH]
	),
	food(
		"squid-raw",
		"Mollusks, squid, mixed species, raw",
		["92", "15.58", "3.08", "1.38"],
		[CAT_FISH]
	),
];

const DAIRY_FOODS: readonly SeedFood[] = [
	food(
		"egg-whole-raw",
		"Egg, whole, raw, fresh",
		["143", "12.56", "0.72", "9.51"],
		[CAT_DAIRY]
	),
	food(
		"egg-piece",
		"Egg, whole, large (50 g)",
		["71.50", "6.28", "0.36", "4.76"],
		[CAT_DAIRY],
		"piece",
		"50"
	),
	food(
		"egg-white-raw",
		"Egg, white, raw, fresh",
		["52", "10.90", "0.73", "0.17"],
		[CAT_DAIRY]
	),
	food(
		"milk-whole",
		"Milk, whole, 3.25% milkfat, with vitamin D",
		["61", "3.15", "4.80", "3.25"],
		[CAT_DAIRY]
	),
	food(
		"milk-whole-cup",
		"Milk, whole, 1 cup (244 g)",
		["148.84", "7.69", "11.71", "7.93"],
		[CAT_DAIRY],
		"cup",
		"244"
	),
	food(
		"milk-whole-liter",
		"Milk, whole, 1 litre (1030 g)",
		["628.30", "32.45", "49.44", "33.48"],
		[CAT_DAIRY, CAT_BEVERAGES],
		"liters",
		"1030"
	),
	food(
		"milk-skim",
		"Milk, nonfat (skim), with added vitamin A and D",
		["34", "3.37", "4.96", "0.08"],
		[CAT_DAIRY]
	),
	food(
		"milk-skim-liter",
		"Milk, nonfat (skim), 1 litre (1035 g)",
		["351.90", "34.88", "51.34", "0.83"],
		[CAT_DAIRY, CAT_BEVERAGES],
		"liters",
		"1035"
	),
	food(
		"greek-yogurt-nonfat",
		"Yogurt, Greek, plain, nonfat",
		["61", "10.30", "3.64", "0.37"],
		[CAT_DAIRY]
	),
	food(
		"greek-yogurt-whole",
		"Yogurt, Greek, plain, whole milk",
		["97", "9.00", "3.98", "5.00"],
		[CAT_DAIRY]
	),
	food(
		"yogurt-plain-lowfat",
		"Yogurt, plain, low fat",
		["63", "5.25", "7.04", "1.55"],
		[CAT_DAIRY]
	),
	food(
		"cottage-cheese-2",
		"Cheese, cottage, lowfat, 2% milkfat",
		["84", "11.00", "4.31", "2.30"],
		[CAT_DAIRY]
	),
	food(
		"cheddar-cheese",
		"Cheese, cheddar",
		["408", "23.30", "2.44", "34.00"],
		[CAT_DAIRY]
	),
	food(
		"mozzarella-partskim",
		"Cheese, mozzarella, part skim, low moisture",
		["254", "24.26", "2.77", "15.92"],
		[CAT_DAIRY]
	),
	food(
		"feta-cheese",
		"Cheese, feta",
		["264", "14.21", "4.09", "21.28"],
		[CAT_DAIRY]
	),
	food(
		"parmesan-hard",
		"Cheese, parmesan, hard",
		["392", "35.75", "3.22", "25.83"],
		[CAT_DAIRY]
	),
	food(
		"parmesan-grated-tbsp",
		"Cheese, parmesan, grated, 1 tbsp (5 g)",
		["21", "1.42", "0.70", "1.39"],
		[CAT_DAIRY],
		"tbsp",
		"5"
	),
	food(
		"ricotta-partskim",
		"Cheese, ricotta, part skim milk",
		["138", "11.39", "5.14", "7.91"],
		[CAT_DAIRY]
	),
	food(
		"cream-cheese",
		"Cheese, cream",
		["350", "6.15", "5.52", "34.24"],
		[CAT_DAIRY]
	),
	food(
		"butter-salted",
		"Butter, salted",
		["717", "0.85", "0.06", "81.11"],
		[CAT_DAIRY, CAT_OILS]
	),
	food(
		"butter-tbsp",
		"Butter, salted, 1 tbsp (14.2 g)",
		["101.81", "0.12", "0.01", "11.52"],
		[CAT_DAIRY, CAT_OILS],
		"tbsp",
		"14.2"
	),
	food(
		"almond-milk-liter",
		"Almond milk, unsweetened, 1 litre (1030 g)",
		["154.50", "6.08", "5.97", "12.57"],
		[CAT_DAIRY, CAT_BEVERAGES],
		"liters",
		"1030"
	),
];

const NUT_FOODS: readonly SeedFood[] = [
	food(
		"almonds-raw",
		"Nuts, almonds",
		["579", "21.15", "21.55", "49.93"],
		[CAT_NUTS]
	),
	food(
		"walnuts-raw",
		"Nuts, walnuts, English",
		["654", "15.23", "13.71", "65.21"],
		[CAT_NUTS]
	),
	food(
		"cashews-raw",
		"Nuts, cashew nuts, raw",
		["553", "18.22", "30.19", "43.85"],
		[CAT_NUTS]
	),
	food(
		"pistachios-raw",
		"Nuts, pistachio nuts, raw",
		["560", "20.16", "27.17", "45.32"],
		[CAT_NUTS]
	),
	food(
		"hazelnuts-raw",
		"Nuts, hazelnuts or filberts",
		["628", "14.95", "16.70", "60.75"],
		[CAT_NUTS]
	),
	food(
		"pecans-raw",
		"Nuts, pecans",
		["691", "9.17", "13.86", "71.97"],
		[CAT_NUTS]
	),
	food(
		"peanuts-raw",
		"Peanuts, all types, raw",
		["567", "25.80", "16.13", "49.24"],
		[CAT_NUTS]
	),
	food(
		"peanut-butter",
		"Peanut butter, smooth style, without salt",
		["598", "22.20", "22.30", "51.40"],
		[CAT_NUTS]
	),
	food(
		"peanut-butter-tbsp",
		"Peanut butter, smooth, 1 tbsp (16 g)",
		["95.68", "3.55", "3.57", "8.22"],
		[CAT_NUTS],
		"tbsp",
		"16"
	),
	food(
		"almond-butter",
		"Nuts, almond butter, plain, without salt",
		["614", "20.96", "18.82", "55.50"],
		[CAT_NUTS]
	),
	food(
		"almond-butter-tbsp",
		"Almond butter, plain, 1 tbsp (16 g)",
		["98.24", "3.35", "3.01", "8.88"],
		[CAT_NUTS],
		"tbsp",
		"16"
	),
	food(
		"chia-seeds",
		"Seeds, chia seeds, dried",
		["486", "16.54", "42.12", "30.74"],
		[CAT_NUTS]
	),
	food(
		"chia-seeds-tbsp",
		"Chia seeds, dried, 1 tbsp (12 g)",
		["58.32", "1.98", "5.05", "3.69"],
		[CAT_NUTS],
		"tbsp",
		"12"
	),
	food(
		"flaxseed",
		"Seeds, flaxseed",
		["534", "18.29", "28.88", "42.16"],
		[CAT_NUTS]
	),
	food(
		"sunflower-seeds",
		"Seeds, sunflower seed kernels, dried",
		["584", "20.78", "20.00", "51.46"],
		[CAT_NUTS]
	),
	food(
		"pumpkin-seeds",
		"Seeds, pumpkin seed kernels, roasted, without salt",
		["574", "29.84", "14.71", "49.05"],
		[CAT_NUTS]
	),
	food(
		"sesame-seeds",
		"Seeds, sesame seeds, whole, dried",
		["573", "17.73", "23.45", "49.67"],
		[CAT_NUTS]
	),
	food(
		"tahini",
		"Seeds, sesame butter, tahini",
		["595", "17.00", "21.19", "53.76"],
		[CAT_NUTS]
	),
	food(
		"tahini-tbsp",
		"Tahini (sesame butter), 1 tbsp (15 g)",
		["89.25", "2.55", "3.18", "8.06"],
		[CAT_NUTS],
		"tbsp",
		"15"
	),
];

const OIL_FOODS: readonly SeedFood[] = [
	food(
		"olive-oil",
		"Oil, olive, salad or cooking",
		["884", "0", "0", "100"],
		[CAT_OILS]
	),
	food(
		"olive-oil-tbsp",
		"Oil, olive, 1 tbsp (13.5 g)",
		["119.34", "0", "0", "13.50"],
		[CAT_OILS],
		"tbsp",
		"13.5"
	),
	food("canola-oil", "Oil, canola", ["884", "0", "0", "100"], [CAT_OILS]),
	food("sunflower-oil", "Oil, sunflower", ["884", "0", "0", "100"], [CAT_OILS]),
	food(
		"sesame-oil",
		"Oil, sesame, salad or cooking",
		["884", "0", "0", "100"],
		[CAT_OILS]
	),
	food(
		"sesame-oil-tbsp",
		"Oil, sesame, 1 tbsp (13.6 g)",
		["120.22", "0", "0", "13.60"],
		[CAT_OILS],
		"tbsp",
		"13.6"
	),
	food("avocado-oil", "Oil, avocado", ["884", "0", "0", "100"], [CAT_OILS]),
	food("coconut-oil", "Oil, coconut", ["892", "0", "0", "99.06"], [CAT_OILS]),
	food(
		"ghee",
		"Butter oil, anhydrous (ghee)",
		["876", "0.28", "0", "99.48"],
		[CAT_OILS]
	),
];

const BEVERAGE_FOODS: readonly SeedFood[] = [
	food(
		"water-liter",
		"Water, bottled, plain, 1 litre",
		["0", "0", "0", "0"],
		[CAT_BEVERAGES],
		"liters",
		"1000"
	),
	food(
		"orange-juice-raw",
		"Orange juice, raw",
		["45", "0.70", "10.40", "0.20"],
		[CAT_BEVERAGES]
	),
	food(
		"orange-juice-liter",
		"Orange juice, raw, 1 litre (1038 g)",
		["467.10", "7.27", "107.95", "2.08"],
		[CAT_BEVERAGES],
		"liters",
		"1038"
	),
	food(
		"apple-juice",
		"Apple juice, canned or bottled, unsweetened",
		["46", "0.10", "11.30", "0.13"],
		[CAT_BEVERAGES]
	),
	food(
		"coconut-water-liter",
		"Coconut water, unsweetened, 1 litre (1030 g)",
		["195.70", "7.42", "38.21", "2.06"],
		[CAT_BEVERAGES],
		"liters",
		"1030"
	),
	food(
		"coffee-brewed",
		"Beverages, coffee, brewed, prepared with tap water",
		["1", "0.12", "0", "0.02"],
		[CAT_BEVERAGES]
	),
	food(
		"coffee-cup",
		"Coffee, brewed, 1 cup (237 g)",
		["2.37", "0.28", "0", "0.05"],
		[CAT_BEVERAGES],
		"cup",
		"237"
	),
	food(
		"tea-black-cup",
		"Tea, black, brewed, 1 cup (237 g)",
		["2.37", "0", "0.71", "0"],
		[CAT_BEVERAGES],
		"cup",
		"237"
	),
	food(
		"cola-regular",
		"Beverages, carbonated, cola, regular",
		["37", "0.07", "9.56", "0.02"],
		[CAT_BEVERAGES]
	),
];

const PREPARED_FOODS: readonly SeedFood[] = [
	food(
		"falafel-piece",
		"Falafel, home-prepared, 1 patty (17 g)",
		["56.61", "2.26", "5.41", "3.03"],
		[CAT_PREPARED, CAT_LEGUMES],
		"piece",
		"17"
	),
	food(
		"falafel",
		"Falafel, home-prepared",
		["333", "13.31", "31.84", "17.80"],
		[CAT_PREPARED, CAT_LEGUMES]
	),
	food(
		"pizza-cheese",
		"Pizza, cheese topping, regular crust, frozen, cooked",
		["268", "11.30", "33.20", "9.70"],
		[CAT_PREPARED]
	),
	food(
		"macaroni-and-cheese",
		"Macaroni and cheese, box mix with cheese sauce, prepared",
		["164", "6.30", "20.40", "6.20"],
		[CAT_PREPARED]
	),
	food(
		"chicken-noodle-soup",
		"Soup, chicken noodle, canned, condensed, prepared with water",
		["30", "1.60", "3.60", "0.94"],
		[CAT_PREPARED]
	),
	food(
		"vegetable-soup",
		"Soup, vegetable, canned, condensed, prepared with water",
		["30", "0.85", "5.90", "0.66"],
		[CAT_PREPARED]
	),
	food(
		"potato-salad",
		"Potato salad, home-prepared",
		["143", "2.68", "11.17", "9.86"],
		[CAT_PREPARED]
	),
	food(
		"coleslaw",
		"Coleslaw, home-prepared",
		["152", "1.40", "14.90", "10.30"],
		[CAT_PREPARED]
	),
	food(
		"french-fries-oven",
		"Potatoes, french fried, frozen, oven-heated",
		["172", "2.66", "27.66", "5.44"],
		[CAT_PREPARED]
	),
	food(
		"pancake-piece",
		"Pancakes, plain, prepared from recipe, 1 pancake (38 g)",
		["86.26", "2.43", "10.75", "3.69"],
		[CAT_PREPARED, CAT_GRAINS],
		"piece",
		"38"
	),
];

const PANTRY_FOODS: readonly SeedFood[] = [
	food("honey", "Honey", ["304", "0.30", "82.40", "0"], [CAT_PANTRY]),
	food(
		"honey-tbsp",
		"Honey, 1 tbsp (21 g)",
		["63.84", "0.06", "17.30", "0"],
		[CAT_PANTRY],
		"tbsp",
		"21"
	),
	food(
		"maple-syrup-tbsp",
		"Syrups, maple, 1 tbsp (20 g)",
		["52", "0.01", "13.41", "0.01"],
		[CAT_PANTRY],
		"tbsp",
		"20"
	),
	food(
		"sugar-granulated",
		"Sugars, granulated",
		["387", "0", "99.98", "0"],
		[CAT_PANTRY]
	),
	food(
		"mayonnaise-tbsp",
		"Mayonnaise, regular, 1 tbsp (13.8 g)",
		["93.84", "0.13", "0.08", "10.33"],
		[CAT_PANTRY, CAT_OILS],
		"tbsp",
		"13.8"
	),
	food(
		"ketchup-tbsp",
		"Catsup (ketchup), 1 tbsp (17 g)",
		["17", "0.20", "4.52", "0.02"],
		[CAT_PANTRY],
		"tbsp",
		"17"
	),
	food(
		"mustard-tbsp",
		"Mustard, prepared, yellow, 1 tbsp (15 g)",
		["9.45", "0.59", "0.90", "0.59"],
		[CAT_PANTRY],
		"tbsp",
		"15"
	),
	food(
		"soy-sauce-tbsp",
		"Soy sauce made from soy and wheat, 1 tbsp (16 g)",
		["8.64", "1.30", "0.79", "0.09"],
		[CAT_PANTRY],
		"tbsp",
		"16"
	),
	food(
		"balsamic-vinegar-tbsp",
		"Vinegar, balsamic, 1 tbsp (16 g)",
		["14.08", "0.08", "2.72", "0"],
		[CAT_PANTRY],
		"tbsp",
		"16"
	),
	food(
		"dark-chocolate-70",
		"Chocolate, dark, 70-85% cacao solids",
		["598", "7.79", "45.90", "42.63"],
		[CAT_PANTRY]
	),
];

const FOODS: readonly SeedFood[] = [
	...VEGETABLE_FOODS,
	...FRUIT_FOODS,
	...GRAIN_FOODS,
	...LEGUME_FOODS,
	...MEAT_FOODS,
	...FISH_FOODS,
	...DAIRY_FOODS,
	...NUT_FOODS,
	...OIL_FOODS,
	...BEVERAGE_FOODS,
	...PREPARED_FOODS,
	...PANTRY_FOODS,
];

// ---------------------------------------------------------------------------
// People and organizations
// ---------------------------------------------------------------------------

/** Shared by every seeded account. Demo data only — never ship this anywhere. */
const DEMO_PASSWORD = "Passw0rd!23";

const ORG_A = "meridian";
const ORG_B = "harbourview";

const ORGANIZATIONS: ReadonlyArray<{
	key: string;
	name: string;
	slug: string;
}> = [
	{ key: ORG_A, name: "Meridian Wellness Group", slug: "meridian-wellness" },
	{ key: ORG_B, name: "Harbourview Sports Club", slug: "harbourview-sports" },
];

/** `user.role`; `null` is never used because Better Auth defaults it to `user`. */
type AppRole = "admin" | "coach" | "nutritionist" | "user";

/** `member.role`; `null` means the person belongs to no organization. */
type OrgRole =
	| "client_admin"
	| "coach"
	| "direct_admin"
	| "member"
	| "nutritionist"
	| "owner"
	| null;

interface SeedUser {
	appRole: AppRole;
	dob: string;
	email: string;
	key: string;
	name: string;
	orgKey: string | null;
	orgRole: OrgRole;
	/** What this account exists to demonstrate. Surfaces in the seeder output. */
	purpose: string;
}

/**
 * One account per distinct access level, then the extra participants that give
 * the org screens (leaderboard, member list, assignments) something to show.
 *
 * The two role axes are independent: `appRole` is `user.role`, checked by the
 * platform-admin and global-nutritionist guards; `orgRole` is `member.role`,
 * checked by the organization guards. Only `orgRole === 'member'` may be
 * assigned a diet plan or ranked on the leaderboard.
 */
const USERS: readonly SeedUser[] = [
	{
		key: "admin",
		name: "Amina Farouk",
		email: "admin@brnit.test",
		appRole: "admin",
		orgKey: null,
		orgRole: null,
		dob: "1984-03-11",
		purpose: "Platform admin: bypasses org checks, sees the admin console.",
	},
	{
		key: "nutritionist-global",
		name: "Omar Zaki",
		email: "nutritionist.global@brnit.test",
		appRole: "nutritionist",
		orgKey: null,
		orgRole: null,
		dob: "1987-07-22",
		purpose:
			"Global nutritionist with no org — exercises requireNutritionistOrgContext failing.",
	},
	{
		key: "nutritionist-global-org",
		name: "Layla Mansour",
		email: "nutritionist.orgstaff@brnit.test",
		appRole: "nutritionist",
		orgKey: ORG_A,
		orgRole: "nutritionist",
		dob: "1986-11-04",
		purpose: "Global nutritionist who is also org staff in Meridian.",
	},
	{
		key: "nutritionist-org",
		name: "Yara Khalil",
		email: "nutritionist.org@brnit.test",
		appRole: "user",
		orgKey: ORG_A,
		orgRole: "nutritionist",
		dob: "1991-02-17",
		purpose: "Org-only nutritionist — the common case.",
	},
	{
		key: "owner",
		name: "Karim Haddad",
		email: "owner@brnit.test",
		appRole: "user",
		orgKey: ORG_A,
		orgRole: "owner",
		dob: "1979-09-30",
		purpose: "Org creator: full member and invitation control.",
	},
	{
		key: "direct-admin",
		name: "Nour El-Sayed",
		email: "direct.admin@brnit.test",
		appRole: "user",
		orgKey: ORG_A,
		orgRole: "direct_admin",
		dob: "1990-05-08",
		purpose: "Staff: records InBody assessments, may invite any role.",
	},
	{
		key: "client-admin",
		name: "Hana Ibrahim",
		email: "client.admin@brnit.test",
		appRole: "user",
		orgKey: ORG_A,
		orgRole: "client_admin",
		dob: "1988-12-19",
		purpose: "HR: may invite only as member, cannot change roles.",
	},
	{
		key: "coach",
		name: "Tarek Aziz",
		email: "coach@brnit.test",
		appRole: "coach",
		orgKey: ORG_A,
		orgRole: "coach",
		dob: "1992-06-25",
		purpose: "Coach on both axes.",
	},
	{
		key: "member",
		name: "Maya Hassan",
		email: "member@brnit.test",
		appRole: "user",
		orgKey: ORG_A,
		orgRole: "member",
		dob: "1995-04-02",
		purpose:
			"The participant: assigned plan covering today, logged meals, swaps, live streak.",
	},
	{
		key: "orgless",
		name: "Sami Nasser",
		email: "orgless@brnit.test",
		appRole: "user",
		orgKey: null,
		orgRole: null,
		dob: "1993-10-14",
		purpose: "Authenticated but org-less — exercises the NO_ORGANIZATION path.",
	},
	{
		key: "member-dina",
		name: "Dina Saleh",
		email: "dina.saleh@brnit.test",
		appRole: "user",
		orgKey: ORG_A,
		orgRole: "member",
		dob: "1989-01-27",
		purpose: "Meridian participant, assessments and an active plan.",
	},
	{
		key: "member-youssef",
		name: "Youssef Adel",
		email: "youssef.adel@brnit.test",
		appRole: "user",
		orgKey: ORG_A,
		orgRole: "member",
		dob: "1986-08-05",
		purpose: "Meridian participant, assessments and an active plan.",
	},
	{
		key: "member-rana",
		name: "Rana Fathy",
		email: "rana.fathy@brnit.test",
		appRole: "user",
		orgKey: ORG_A,
		orgRole: "member",
		dob: "1994-03-18",
		purpose: "Meridian participant, assessments and an active plan.",
	},
	{
		key: "member-hassan",
		name: "Hassan Gamal",
		email: "hassan.gamal@brnit.test",
		appRole: "user",
		orgKey: ORG_A,
		orgRole: "member",
		dob: "1983-11-09",
		purpose: "Meridian participant, assessments and an active plan.",
	},
	{
		key: "member-nadia",
		name: "Nadia Rashid",
		email: "nadia.rashid@brnit.test",
		appRole: "user",
		orgKey: ORG_A,
		orgRole: "member",
		dob: "1996-07-31",
		purpose:
			"Meridian participant with a single assessment — leaderboard 'not_enough_assessments'.",
	},
	{
		key: "member-bassem",
		name: "Bassem Wahba",
		email: "bassem.wahba@brnit.test",
		appRole: "user",
		orgKey: ORG_A,
		orgRole: "member",
		dob: "1985-05-21",
		purpose: "Meridian participant, assessments only (no plan).",
	},
	{
		key: "member-salma",
		name: "Salma Darwish",
		email: "salma.darwish@brnit.test",
		appRole: "user",
		orgKey: ORG_A,
		orgRole: "member",
		dob: "1997-09-12",
		purpose: "Meridian participant, assessments only (no plan).",
	},
	{
		key: "owner-b",
		name: "Georgia Whitaker",
		email: "owner.b@brnit.test",
		appRole: "user",
		orgKey: ORG_B,
		orgRole: "owner",
		dob: "1981-04-23",
		purpose: "Owner of the second organization — proves org scoping.",
	},
	{
		key: "member-marcus",
		name: "Marcus Feld",
		email: "marcus.feld@brnit.test",
		appRole: "user",
		orgKey: ORG_B,
		orgRole: "member",
		dob: "1990-02-06",
		purpose: "Harbourview participant.",
	},
	{
		key: "member-priya",
		name: "Priya Raman",
		email: "priya.raman@brnit.test",
		appRole: "user",
		orgKey: ORG_B,
		orgRole: "member",
		dob: "1993-12-01",
		purpose: "Harbourview participant with an active plan.",
	},
	{
		key: "member-tomas",
		name: "Tomas Aleman",
		email: "tomas.aleman@brnit.test",
		appRole: "user",
		orgKey: ORG_B,
		orgRole: "member",
		dob: "1988-06-16",
		purpose: "Harbourview participant.",
	},
];

// ---------------------------------------------------------------------------
// InBody-style body composition assessments
//
// Every column is NOT NULL and tightly scaled: bmi is numeric(4,2), so it must
// stay under 100. Figures are internally consistent — bmi is weight / height²
// — and body fat trends DOWN across each person's series, because the org
// leaderboard ranks members on (first body fat − last body fat) and only
// counts members holding at least two assessments.
// ---------------------------------------------------------------------------

interface SeedAssessment {
	bmi: string;
	bodyFatPercent: string;
	bodyWaterL: string;
	daysAgo: number;
	heightCm: string;
	muscleMassKg: string;
	userKey: string;
	visceralFatAreaCm2: string;
	weightKg: string;
}

function assessment(
	userKey: string,
	daysAgo: number,
	heightCm: string,
	weightKg: string,
	bmi: string,
	bodyFatPercent: string,
	muscleMassKg: string,
	visceralFatAreaCm2: string,
	bodyWaterL: string
): SeedAssessment {
	return {
		bmi,
		bodyFatPercent,
		bodyWaterL,
		daysAgo,
		heightCm,
		muscleMassKg,
		userKey,
		visceralFatAreaCm2,
		weightKg,
	};
}

const ASSESSMENTS: readonly SeedAssessment[] = [
	assessment(
		"member",
		150,
		"165.00",
		"74.20",
		"27.26",
		"34.10",
		"26.80",
		"108.50",
		"35.80"
	),
	assessment(
		"member",
		90,
		"165.00",
		"71.00",
		"26.08",
		"31.60",
		"27.40",
		"96.20",
		"36.40"
	),
	assessment(
		"member",
		30,
		"165.00",
		"68.30",
		"25.09",
		"29.20",
		"27.90",
		"85.40",
		"36.90"
	),
	assessment(
		"member-dina",
		140,
		"170.00",
		"82.50",
		"28.55",
		"36.80",
		"29.10",
		"118.30",
		"38.70"
	),
	assessment(
		"member-dina",
		80,
		"170.00",
		"79.10",
		"27.37",
		"34.20",
		"29.80",
		"106.90",
		"39.40"
	),
	assessment(
		"member-dina",
		20,
		"170.00",
		"76.40",
		"26.44",
		"32.10",
		"30.30",
		"97.60",
		"39.90"
	),
	assessment(
		"member-youssef",
		160,
		"178.00",
		"94.60",
		"29.86",
		"28.40",
		"38.20",
		"132.70",
		"48.60"
	),
	assessment(
		"member-youssef",
		95,
		"178.00",
		"90.20",
		"28.47",
		"25.90",
		"38.90",
		"118.40",
		"49.50"
	),
	assessment(
		"member-youssef",
		25,
		"178.00",
		"86.80",
		"27.40",
		"23.60",
		"39.70",
		"105.20",
		"50.30"
	),
	assessment(
		"member-rana",
		120,
		"162.00",
		"66.40",
		"25.30",
		"32.40",
		"24.90",
		"92.10",
		"32.60"
	),
	assessment(
		"member-rana",
		60,
		"162.00",
		"64.20",
		"24.46",
		"30.50",
		"25.30",
		"84.70",
		"33.10"
	),
	assessment(
		"member-rana",
		12,
		"162.00",
		"62.50",
		"23.81",
		"28.90",
		"25.60",
		"78.30",
		"33.50"
	),
	assessment(
		"member-hassan",
		135,
		"183.00",
		"101.30",
		"30.25",
		"30.20",
		"39.60",
		"145.80",
		"50.90"
	),
	assessment(
		"member-hassan",
		70,
		"183.00",
		"97.40",
		"29.08",
		"28.10",
		"40.20",
		"133.40",
		"51.80"
	),
	assessment(
		"member-hassan",
		15,
		"183.00",
		"93.90",
		"28.04",
		"26.30",
		"40.80",
		"122.90",
		"52.60"
	),
	assessment(
		"member-nadia",
		40,
		"168.00",
		"70.10",
		"24.84",
		"30.80",
		"26.20",
		"88.60",
		"34.90"
	),
	assessment(
		"member-bassem",
		100,
		"175.00",
		"88.40",
		"28.87",
		"27.30",
		"36.10",
		"124.60",
		"46.20"
	),
	assessment(
		"member-bassem",
		35,
		"175.00",
		"85.90",
		"28.05",
		"25.40",
		"36.70",
		"114.30",
		"46.90"
	),
	assessment(
		"member-salma",
		110,
		"160.00",
		"63.80",
		"24.92",
		"31.90",
		"24.10",
		"90.40",
		"31.80"
	),
	assessment(
		"member-salma",
		28,
		"160.00",
		"61.90",
		"24.18",
		"30.20",
		"24.40",
		"83.70",
		"32.20"
	),
	assessment(
		"member-marcus",
		90,
		"180.00",
		"92.10",
		"28.43",
		"26.80",
		"37.80",
		"121.40",
		"48.10"
	),
	assessment(
		"member-marcus",
		20,
		"180.00",
		"89.30",
		"27.56",
		"24.90",
		"38.30",
		"111.80",
		"48.70"
	),
	assessment(
		"member-priya",
		85,
		"158.00",
		"60.20",
		"24.11",
		"30.60",
		"22.90",
		"86.20",
		"30.40"
	),
	assessment(
		"member-priya",
		18,
		"158.00",
		"58.40",
		"23.39",
		"28.70",
		"23.20",
		"79.50",
		"30.80"
	),
];

/** Who signs an assessment, per organization. `recorded_by_id` is NO ACTION. */
const ASSESSMENT_RECORDER_BY_ORG: Readonly<Record<string, string>> = {
	[ORG_A]: "direct-admin",
	[ORG_B]: "owner-b",
};

// ---------------------------------------------------------------------------
// Authored meals
//
// Quantities land on the unit's UI step (`mealQuantityStep` in
// `@brnit/domain`): multiples of 50 for `100g`, whole numbers for `piece`,
// halves for `liters` / `cup` / `tbsp`. Small additions — oil, nut butter,
// honey, grated cheese — use `tbsp` items rather than a 50 g minimum of the
// per-100 g row, which is what those units exist for.
//
// A handful of quantities are also chosen to keep each meal's raw macro sum
// off an exact `.xx5` rounding boundary. `computeMealTotalsFromLineItems` sums
// IEEE-754 floats and rounds once at the end, and `recomputeMealTotals` in the
// API reads the lines back with no ORDER BY — so a total sitting precisely on
// a boundary can come out 0.01 either way depending on the order Postgres
// happens to return the rows in. Every meal below is order-independent, which
// is what makes `meal.total_*` reproducible across re-seeds and equal to what
// the app would recompute. If you change a line, re-check the totals.
// ---------------------------------------------------------------------------

interface SeedMealLine {
	foodKey: string;
	quantity: string;
}

interface SeedMeal {
	description: string;
	key: string;
	lines: readonly SeedMealLine[];
	name: string;
}

function line(foodKey: string, quantity: string): SeedMealLine {
	return { foodKey, quantity };
}

const MEALS: readonly SeedMeal[] = [
	{
		key: "yogurt-berry-bowl",
		name: "Greek Yogurt & Berry Bowl",
		description: "High-protein breakfast bowl with fresh blueberries.",
		lines: [
			line("greek-yogurt-nonfat", "200"),
			line("blueberry-raw", "100"),
			line("honey-tbsp", "1"),
			line("chia-seeds-tbsp", "1"),
		],
	},
	{
		key: "oatmeal-banana-pb",
		name: "Oatmeal with Banana & Peanut Butter",
		description: "Rolled oats cooked in milk, topped with banana.",
		lines: [
			line("oats-dry", "50"),
			line("milk-whole-cup", "1.5"),
			line("banana-piece", "1"),
			line("peanut-butter-tbsp", "1"),
		],
	},
	{
		key: "veggie-omelette-toast",
		name: "Veggie Omelette & Toast",
		description: "Three-egg omelette with wilted spinach and a slice of toast.",
		lines: [
			line("egg-piece", "3"),
			line("spinach-raw", "50"),
			line("olive-oil-tbsp", "0.5"),
			line("wholewheat-bread-slice", "1"),
		],
	},
	{
		key: "chicken-rice-broccoli",
		name: "Grilled Chicken, Rice & Broccoli",
		description: "The classic lean lunch plate.",
		lines: [
			line("chicken-breast-cooked", "150"),
			line("white-rice-cooked", "200"),
			line("broccoli-cooked", "100"),
			line("olive-oil-tbsp", "0.5"),
		],
	},
	{
		key: "salmon-quinoa-asparagus",
		name: "Salmon, Quinoa & Asparagus",
		description: "Baked salmon fillet with quinoa and roasted asparagus.",
		lines: [
			line("salmon-cooked", "150"),
			line("quinoa-cooked", "150"),
			line("asparagus-raw", "100"),
			line("olive-oil-tbsp", "0.5"),
		],
	},
	{
		key: "lentil-soup-pita",
		name: "Lentil Soup with Pita",
		description: "Slow-cooked red lentils with carrot and onion.",
		lines: [
			line("lentils-cooked", "300"),
			line("carrot-raw", "100"),
			line("onion-raw", "50"),
			line("pita-piece", "1"),
			line("olive-oil-tbsp", "0.5"),
		],
	},
	{
		key: "chickpea-feta-salad",
		name: "Chickpea & Feta Salad",
		description: "Cold chickpea salad with cucumber, tomato and feta.",
		lines: [
			line("chickpeas-cooked", "150"),
			line("cucumber-raw", "100"),
			line("tomato-raw", "150"),
			line("feta-cheese", "50"),
			line("olive-oil-tbsp", "1"),
		],
	},
	{
		key: "tuna-sandwich",
		name: "Tuna Salad Sandwich",
		description: "Canned tuna on wholemeal with crisp lettuce.",
		lines: [
			line("tuna-canned-water", "100"),
			line("wholewheat-bread-slice", "2"),
			line("mayonnaise-tbsp", "1"),
			line("lettuce-romaine", "50"),
		],
	},
	{
		key: "beef-sweet-potato-bowl",
		name: "Beef & Sweet Potato Bowl",
		description: "Lean ground beef with baked sweet potato and green beans.",
		lines: [
			line("beef-ground-90-cooked", "150"),
			line("sweet-potato-baked", "200"),
			line("green-beans-raw", "100"),
		],
	},
	{
		key: "cottage-cheese-fruit",
		name: "Cottage Cheese & Fruit Plate",
		description:
			"Low-fat cottage cheese with strawberries and a drizzle of honey.",
		lines: [
			line("cottage-cheese-2", "200"),
			line("strawberry-raw", "100"),
			line("honey-tbsp", "0.5"),
		],
	},
	{
		key: "turkey-avocado-wrap",
		name: "Turkey & Avocado Wrap",
		description: "Roast turkey breast, avocado and salad in a flour tortilla.",
		lines: [
			line("turkey-breast-cooked", "100"),
			line("flour-tortilla-piece", "1"),
			line("avocado-raw", "50"),
			line("lettuce-romaine", "100"),
			line("tomato-raw", "50"),
		],
	},
	{
		key: "shrimp-stirfry-brown-rice",
		name: "Shrimp Stir-Fry with Brown Rice",
		description: "Quick shrimp and pepper stir-fry over brown rice.",
		lines: [
			line("shrimp-cooked", "150"),
			line("brown-rice-cooked", "200"),
			line("pepper-red-raw", "100"),
			line("broccoli-raw", "100"),
			line("sesame-oil-tbsp", "0.5"),
		],
	},
	{
		key: "overnight-oats-chia",
		name: "Overnight Oats with Chia & Raspberries",
		description: "Soaked oats with chia seeds and fresh raspberries.",
		lines: [
			line("oats-dry", "50"),
			line("milk-whole-cup", "1"),
			line("chia-seeds-tbsp", "1.5"),
			line("raspberry-raw", "50"),
			line("honey-tbsp", "0.5"),
		],
	},
	{
		key: "tofu-veg-stirfry",
		name: "Tofu & Vegetable Stir-Fry",
		description: "Firm tofu with broccoli and carrot over brown rice.",
		lines: [
			line("tofu-firm-calcium", "200"),
			line("broccoli-raw", "100"),
			line("carrot-raw", "50"),
			line("brown-rice-cooked", "150"),
			line("sesame-oil-tbsp", "0.5"),
		],
	},
	{
		key: "falafel-hummus-plate",
		name: "Falafel & Hummus Plate",
		description: "Four falafel patties with hummus, salad and pita.",
		lines: [
			line("falafel-piece", "4"),
			line("hummus-commercial", "100"),
			line("tomato-raw", "50"),
			line("cucumber-raw", "100"),
			line("pita-piece", "1"),
		],
	},
	{
		key: "cod-bulgur-roasted-veg",
		name: "Cod with Bulgur & Roasted Vegetables",
		description: "Baked cod fillet, bulgur pilaf and roasted courgette.",
		lines: [
			line("cod-cooked", "150"),
			line("bulgur-cooked", "200"),
			line("zucchini-raw", "100"),
			line("pepper-red-raw", "50"),
			line("olive-oil-tbsp", "1"),
		],
	},
	{
		key: "apple-almond-butter",
		name: "Apple & Almond Butter Snack",
		description: "Sliced apple with a spoon of almond butter.",
		lines: [line("apple-piece", "1"), line("almond-butter-tbsp", "1")],
	},
	{
		key: "protein-berry-smoothie",
		name: "Protein Berry Smoothie",
		description: "Greek yogurt, banana and blueberries blended with milk.",
		lines: [
			line("greek-yogurt-nonfat", "150"),
			line("banana-piece", "1"),
			line("blueberry-raw", "50"),
			line("milk-whole-cup", "1.5"),
			line("peanut-butter-tbsp", "1"),
		],
	},
	{
		key: "chicken-caesar-salad",
		name: "Chicken Caesar-Style Salad",
		description: "Grilled chicken over romaine with parmesan and olive oil.",
		lines: [
			line("chicken-breast-cooked", "150"),
			line("lettuce-romaine", "100"),
			line("parmesan-grated-tbsp", "2"),
			line("olive-oil-tbsp", "1"),
			line("wholewheat-bread-slice", "1"),
		],
	},
	{
		key: "nuts-dates-snack",
		name: "Almond & Date Snack",
		description: "A handful of almonds with medjool dates.",
		lines: [line("almonds-raw", "50"), line("date-piece", "2")],
	},
];

// ---------------------------------------------------------------------------
// Diet plans, assignments, consumption history and swaps
// ---------------------------------------------------------------------------

const MEAL_TYPE_BREAKFAST = "breakfast";
const MEAL_TYPE_LUNCH = "lunch";
const MEAL_TYPE_DINNER = "dinner";
const MEAL_TYPE_SNACK = "snack";

/** `dayNumber = 0` repeats on every day of the plan; `>= 1` is that plan day. */
const DAY_EVERY = 0;

interface SeedPlanSlot {
	dayNumber: number;
	key: string;
	mealKey: string;
	mealOrder: number;
	mealType: string;
	scheduledTime: string;
}

interface SeedPlan {
	description: string;
	key: string;
	name: string;
	slots: readonly SeedPlanSlot[];
}

function slot(
	key: string,
	dayNumber: number,
	mealType: string,
	mealOrder: number,
	scheduledTime: string,
	mealKey: string
): SeedPlanSlot {
	return { dayNumber, key, mealKey, mealOrder, mealType, scheduledTime };
}

const PLANS: readonly SeedPlan[] = [
	{
		key: "lean-reset",
		name: "Lean Reset — 4 Week Rotation",
		description:
			"Moderate deficit with a fixed daily frame and three rotating days.",
		slots: [
			slot(
				"lean-breakfast",
				DAY_EVERY,
				MEAL_TYPE_BREAKFAST,
				1,
				"07:30",
				"yogurt-berry-bowl"
			),
			slot(
				"lean-lunch",
				DAY_EVERY,
				MEAL_TYPE_LUNCH,
				1,
				"13:00",
				"chicken-rice-broccoli"
			),
			slot(
				"lean-snack",
				DAY_EVERY,
				MEAL_TYPE_SNACK,
				1,
				"16:30",
				"apple-almond-butter"
			),
			slot(
				"lean-dinner",
				DAY_EVERY,
				MEAL_TYPE_DINNER,
				1,
				"19:30",
				"cod-bulgur-roasted-veg"
			),
			slot(
				"lean-d2-breakfast",
				2,
				MEAL_TYPE_BREAKFAST,
				2,
				"09:30",
				"overnight-oats-chia"
			),
			slot(
				"lean-d4-lunch",
				4,
				MEAL_TYPE_LUNCH,
				2,
				"13:30",
				"chickpea-feta-salad"
			),
			slot(
				"lean-d7-dinner",
				7,
				MEAL_TYPE_DINNER,
				2,
				"20:00",
				"salmon-quinoa-asparagus"
			),
		],
	},
	{
		key: "high-protein-build",
		name: "High-Protein Build",
		description:
			"Higher protein target for members training four times a week.",
		slots: [
			slot(
				"build-breakfast",
				DAY_EVERY,
				MEAL_TYPE_BREAKFAST,
				1,
				"07:00",
				"veggie-omelette-toast"
			),
			slot(
				"build-snack",
				DAY_EVERY,
				MEAL_TYPE_SNACK,
				1,
				"10:30",
				"protein-berry-smoothie"
			),
			slot(
				"build-lunch",
				DAY_EVERY,
				MEAL_TYPE_LUNCH,
				1,
				"13:00",
				"beef-sweet-potato-bowl"
			),
			slot(
				"build-dinner",
				DAY_EVERY,
				MEAL_TYPE_DINNER,
				1,
				"19:00",
				"chicken-caesar-salad"
			),
			slot(
				"build-d3-lunch",
				3,
				MEAL_TYPE_LUNCH,
				2,
				"13:30",
				"shrimp-stirfry-brown-rice"
			),
			slot(
				"build-d6-dinner",
				6,
				MEAL_TYPE_DINNER,
				2,
				"19:30",
				"salmon-quinoa-asparagus"
			),
		],
	},
	{
		key: "mediterranean-maintenance",
		name: "Mediterranean Maintenance",
		description:
			"Maintenance calories with a plant-forward Mediterranean shape.",
		slots: [
			slot(
				"med-breakfast",
				DAY_EVERY,
				MEAL_TYPE_BREAKFAST,
				1,
				"08:00",
				"oatmeal-banana-pb"
			),
			slot(
				"med-lunch",
				DAY_EVERY,
				MEAL_TYPE_LUNCH,
				1,
				"13:30",
				"lentil-soup-pita"
			),
			slot(
				"med-snack",
				DAY_EVERY,
				MEAL_TYPE_SNACK,
				1,
				"17:00",
				"nuts-dates-snack"
			),
			slot(
				"med-dinner",
				DAY_EVERY,
				MEAL_TYPE_DINNER,
				1,
				"20:00",
				"falafel-hummus-plate"
			),
			slot("med-d2-lunch", 2, MEAL_TYPE_LUNCH, 2, "13:00", "tuna-sandwich"),
			slot(
				"med-d5-dinner",
				5,
				MEAL_TYPE_DINNER,
				2,
				"20:00",
				"tofu-veg-stirfry"
			),
		],
	},
];

/**
 * One assignment per person, every window straddling today, which is what the
 * member Home screen and the streak endpoint need. The API enforces two rules
 * this data respects: the assignee's `member.role` must be `member`, and one
 * person may hold at most one assignment covering any given day.
 */
interface SeedAssignment {
	endOffset: number;
	planKey: string;
	startOffset: number;
	userKey: string;
}

const ASSIGNMENTS: readonly SeedAssignment[] = [
	{ userKey: "member", planKey: "lean-reset", startOffset: -9, endOffset: 20 },
	{
		userKey: "member-dina",
		planKey: "high-protein-build",
		startOffset: -20,
		endOffset: 9,
	},
	{
		userKey: "member-youssef",
		planKey: "lean-reset",
		startOffset: -4,
		endOffset: 25,
	},
	{
		userKey: "member-rana",
		planKey: "mediterranean-maintenance",
		startOffset: -14,
		endOffset: 15,
	},
	{
		userKey: "member-hassan",
		planKey: "high-protein-build",
		startOffset: -2,
		endOffset: 27,
	},
	{
		userKey: "member-priya",
		planKey: "mediterranean-maintenance",
		startOffset: -6,
		endOffset: 23,
	},
];

/**
 * Logged meals. `dayOffsets` must run up to and including 0 for anyone whose
 * streak should be non-zero: `calculateConsumptionStreak` returns 0 the moment
 * today is missing from the set. Only day-0 (every-day) slots are logged, so
 * every row resolves on the date it claims.
 */
interface SeedConsumptionRun {
	dayOffsets: readonly number[];
	hour: number;
	minute: number;
	slotKey: string;
	userKey: string;
}

function offsets(from: number, to: number): number[] {
	const values: number[] = [];
	for (let value = from; value <= to; value += 1) {
		values.push(value);
	}
	return values;
}

const CONSUMPTION_RUNS: readonly SeedConsumptionRun[] = [
	{
		userKey: "member",
		slotKey: "lean-breakfast",
		hour: 7,
		minute: 45,
		dayOffsets: offsets(-9, 0),
	},
	{
		userKey: "member",
		slotKey: "lean-lunch",
		hour: 13,
		minute: 15,
		dayOffsets: offsets(-9, 0),
	},
	{
		userKey: "member-dina",
		slotKey: "build-breakfast",
		hour: 7,
		minute: 15,
		dayOffsets: offsets(-3, 0),
	},
	{
		userKey: "member-dina",
		slotKey: "build-lunch",
		hour: 13,
		minute: 10,
		dayOffsets: offsets(-3, -1),
	},
	{
		userKey: "member-youssef",
		slotKey: "lean-breakfast",
		hour: 8,
		minute: 0,
		dayOffsets: offsets(-4, 0),
	},
	{
		userKey: "member-rana",
		slotKey: "med-breakfast",
		hour: 8,
		minute: 20,
		dayOffsets: offsets(-2, 0),
	},
	{
		userKey: "member-rana",
		slotKey: "med-dinner",
		hour: 20,
		minute: 10,
		dayOffsets: offsets(-2, -1),
	},
	{
		userKey: "member-hassan",
		slotKey: "build-breakfast",
		hour: 7,
		minute: 30,
		dayOffsets: [0],
	},
	{
		userKey: "member-priya",
		slotKey: "med-lunch",
		hour: 13,
		minute: 40,
		dayOffsets: offsets(-1, 0),
	},
];

/**
 * Food swaps. `effective_dates` is the canonical runtime resolver — the
 * `intent_*` columns are audit metadata, and the CHECK constraint requires
 * them to be either both null or a recognised scope with a start date.
 *
 * These deliberately sit on slots nobody has logged a consumption for, so the
 * planned meal a member sees on Home and the snapshot stored against a
 * consumption never contradict each other in the demo data.
 */
interface SeedOverride {
	endOffset: number;
	/** The catalogue row the swap points AT. */
	foodKey: string;
	intentScope: "rest_of_plan" | "single_day";
	quantity: string;
	/** Identifies the `meal_item` being replaced, by the food it holds. */
	replacesFoodKey: string;
	slotKey: string;
	startOffset: number;
	userKey: string;
}

const OVERRIDES: readonly SeedOverride[] = [
	{
		userKey: "member",
		slotKey: "lean-dinner",
		replacesFoodKey: "bulgur-cooked",
		foodKey: "brown-rice-cooked",
		quantity: "200",
		intentScope: "rest_of_plan",
		startOffset: 0,
		endOffset: 20,
	},
	{
		userKey: "member",
		slotKey: "lean-dinner",
		replacesFoodKey: "cod-cooked",
		foodKey: "tilapia-cooked",
		quantity: "150",
		intentScope: "single_day",
		startOffset: 1,
		endOffset: 1,
	},
	{
		userKey: "member",
		slotKey: "lean-snack",
		replacesFoodKey: "apple-piece",
		foodKey: "banana-piece",
		quantity: "1",
		intentScope: "rest_of_plan",
		startOffset: 0,
		endOffset: 20,
	},
	{
		userKey: "member-youssef",
		slotKey: "lean-lunch",
		replacesFoodKey: "white-rice-cooked",
		foodKey: "quinoa-cooked",
		quantity: "200",
		intentScope: "rest_of_plan",
		startOffset: 0,
		endOffset: 25,
	},
];

// ===========================================================================
// SEEDING STEPS
// ===========================================================================

function requireDatabaseUrl(): string {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error(
			"DATABASE_URL is not set. Add it to apps/server/.env, the repo root .env, or the environment."
		);
	}
	return databaseUrl;
}

const db = drizzle(requireDatabaseUrl());

/** Postgres caps a statement at 65535 bind parameters; stay well under it. */
const INSERT_BATCH_SIZE = 200;

function chunk<T>(items: readonly T[], size: number): T[][] {
	const batches: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		batches.push(items.slice(index, index + size));
	}
	return batches;
}

/**
 * Deletes demo-owned rows this file no longer declares.
 *
 * `scope` must name the demo dataset (an `inArray` over ids this seeder minted),
 * never a whole table: nothing outside the demo set may be touched. Without
 * this a composition change — dropping a meal line, shortening a plan — would
 * leave the removed row behind on the next run.
 */
async function pruneStaleRows(
	table: PgTable,
	idColumn: Column,
	scope: SQL,
	keepIds: readonly string[]
): Promise<void> {
	const condition =
		keepIds.length === 0
			? scope
			: and(scope, notInArray(idColumn, [...keepIds]));
	await db.delete(table).where(condition);
}

async function seedFoodCategories(): Promise<Map<string, string>> {
	const rows = await db
		.insert(foodCategory)
		.values(
			FOOD_CATEGORIES.map((category) => ({
				description: category.description,
				id: demoId("food-category", category.name),
				name: category.name,
			}))
		)
		.onConflictDoUpdate({
			target: foodCategory.name,
			set: { description: sql`excluded.description` },
		})
		.returning({ id: foodCategory.id, name: foodCategory.name });

	return new Map(rows.map((row) => [row.name, row.id]));
}

async function seedFoodItems(): Promise<Map<string, string>> {
	const now = new Date();
	const values = FOODS.map((item) => ({
		calories: item.calories,
		carbs: item.carbs,
		fat: item.fat,
		gramsPerUnit: item.gramsPerUnit,
		id: demoId("food-item", item.key),
		name: item.name,
		protein: item.protein,
		unit: item.unit,
		updatedAt: now,
	}));

	for (const batch of chunk(values, INSERT_BATCH_SIZE)) {
		await db
			.insert(foodItem)
			.values(batch)
			.onConflictDoUpdate({
				target: foodItem.id,
				set: {
					calories: sql`excluded.calories`,
					carbs: sql`excluded.carbs`,
					fat: sql`excluded.fat`,
					gramsPerUnit: sql`excluded.grams_per_unit`,
					name: sql`excluded.name`,
					protein: sql`excluded.protein`,
					unit: sql`excluded.unit`,
					updatedAt: sql`excluded.updated_at`,
				},
			});
	}

	return new Map(
		FOODS.map((item) => [item.key, demoId("food-item", item.key)])
	);
}

async function seedFoodItemCategories(
	foodIds: ReadonlyMap<string, string>,
	categoryIds: ReadonlyMap<string, string>
): Promise<number> {
	const values = FOODS.flatMap((item) =>
		item.categories.map((categoryName) => ({
			foodCategoryId: requireId(categoryIds, categoryName, "food category"),
			foodItemId: requireId(foodIds, item.key, "food item"),
		}))
	);

	// Scoped delete: only join rows of demo-owned food items, and only pairings
	// this file no longer declares.
	await db.delete(foodItemCategory).where(
		and(
			inArray(foodItemCategory.foodItemId, [...foodIds.values()]),
			notInArray(
				sql`(${foodItemCategory.foodItemId} || ':' || ${foodItemCategory.foodCategoryId})`,
				values.map((row) => `${row.foodItemId}:${row.foodCategoryId}`)
			)
		)
	);

	for (const batch of chunk(values, INSERT_BATCH_SIZE)) {
		await db.insert(foodItemCategory).values(batch).onConflictDoNothing();
	}
	return values.length;
}

/** Map lookup that fails loudly instead of writing a null foreign key. */
function requireId(
	source: ReadonlyMap<string, string>,
	key: string,
	label: string
): string {
	const id = source.get(key);
	if (!id) {
		throw new Error(`Unknown ${label}: "${key}"`);
	}
	return id;
}

async function seedOrganizations(): Promise<Map<string, string>> {
	await db
		.insert(organization)
		.values(
			ORGANIZATIONS.map((org) => ({
				id: demoId("organization", org.key),
				name: org.name,
				slug: org.slug,
			}))
		)
		.onConflictDoUpdate({
			target: organization.id,
			set: { name: sql`excluded.name`, slug: sql`excluded.slug` },
		});

	return new Map(
		ORGANIZATIONS.map((org) => [org.key, demoId("organization", org.key)])
	);
}

/**
 * Users and their credential accounts.
 *
 * Written directly rather than through `auth.api.signUpEmail`, which would send
 * a verification email (`sendOnSignUp` is on) and throw without SMTP. The
 * password still goes through Better Auth's own scrypt via `hashPassword`, so
 * these accounts sign in through the real endpoint; `email_verified` is set
 * because `requireEmailVerification` is on.
 */
async function seedUsers(): Promise<Map<string, string>> {
	const now = new Date();
	const passwordHash = await hashPassword(DEMO_PASSWORD);
	const userIds = new Map(
		USERS.map((person) => [person.key, demoId("user", person.key)])
	);

	await db
		.insert(user)
		.values(
			USERS.map((person) => ({
				dob: person.dob,
				email: person.email,
				emailVerified: true,
				id: requireId(userIds, person.key, "user"),
				name: person.name,
				role: person.appRole,
				updatedAt: now,
			}))
		)
		.onConflictDoUpdate({
			target: user.id,
			set: {
				dob: sql`excluded.dob`,
				email: sql`excluded.email`,
				emailVerified: sql`excluded.email_verified`,
				name: sql`excluded.name`,
				role: sql`excluded.role`,
				updatedAt: sql`excluded.updated_at`,
			},
		});

	await db
		.insert(account)
		.values(
			USERS.map((person) => {
				const userId = requireId(userIds, person.key, "user");
				return {
					accountId: userId,
					createdAt: now,
					id: demoId("account", person.key),
					password: passwordHash,
					providerId: "credential",
					updatedAt: now,
					userId,
				};
			})
		)
		.onConflictDoUpdate({
			target: account.id,
			set: {
				accountId: sql`excluded.account_id`,
				password: sql`excluded.password`,
				providerId: sql`excluded.provider_id`,
				updatedAt: sql`excluded.updated_at`,
			},
		});

	return userIds;
}

/**
 * `member` has no unique constraint on `(organization_id, user_id)`, so the
 * upsert keys on the deterministic `member.id` instead.
 */
async function seedMembers(
	userIds: ReadonlyMap<string, string>,
	orgIds: ReadonlyMap<string, string>
): Promise<Map<string, string>> {
	const memberships = USERS.filter(
		(person) => person.orgKey !== null && person.orgRole !== null
	);
	const memberIds = new Map(
		memberships.map((person) => [
			person.key,
			demoId("member", `${person.orgKey}:${person.key}`),
		])
	);

	await db
		.insert(member)
		.values(
			memberships.map((person) => ({
				id: requireId(memberIds, person.key, "member"),
				organizationId: requireId(orgIds, person.orgKey ?? "", "organization"),
				role: person.orgRole ?? "member",
				userId: requireId(userIds, person.key, "user"),
			}))
		)
		.onConflictDoUpdate({
			target: member.id,
			set: {
				organizationId: sql`excluded.organization_id`,
				role: sql`excluded.role`,
				userId: sql`excluded.user_id`,
			},
		});

	return memberIds;
}

async function seedAssessments(
	memberIds: ReadonlyMap<string, string>,
	userIds: ReadonlyMap<string, string>
): Promise<number> {
	const orgByUserKey = new Map(
		USERS.map((person) => [person.key, person.orgKey ?? ""])
	);
	const now = new Date();

	const values = ASSESSMENTS.map((row) => {
		const orgKey = orgByUserKey.get(row.userKey) ?? "";
		const recorderKey = ASSESSMENT_RECORDER_BY_ORG[orgKey];
		if (!recorderKey) {
			throw new Error(`No assessment recorder configured for org "${orgKey}"`);
		}
		return {
			assessedAt: timestampAt(-row.daysAgo, 9, 30),
			bmi: row.bmi,
			bodyFatPercent: row.bodyFatPercent,
			bodyWaterL: row.bodyWaterL,
			heightCm: row.heightCm,
			id: demoId("assessment", `${row.userKey}:${row.daysAgo}`),
			memberId: requireId(memberIds, row.userKey, "member"),
			muscleMassKg: row.muscleMassKg,
			recordedById: requireId(userIds, recorderKey, "user"),
			updatedAt: now,
			visceralFatAreaCm2: row.visceralFatAreaCm2,
			weightKg: row.weightKg,
		};
	});

	await db
		.insert(bodyCompositionAssessment)
		.values(values)
		.onConflictDoUpdate({
			target: bodyCompositionAssessment.id,
			set: {
				assessedAt: sql`excluded.assessed_at`,
				bmi: sql`excluded.bmi`,
				bodyFatPercent: sql`excluded.body_fat_percent`,
				bodyWaterL: sql`excluded.body_water_l`,
				heightCm: sql`excluded.height_cm`,
				muscleMassKg: sql`excluded.muscle_mass_kg`,
				recordedById: sql`excluded.recorded_by_id`,
				updatedAt: sql`excluded.updated_at`,
				visceralFatAreaCm2: sql`excluded.visceral_fat_area_cm2`,
				weightKg: sql`excluded.weight_kg`,
			},
		});

	return values.length;
}

const FOOD_BY_KEY = new Map(FOODS.map((item) => [item.key, item]));
const MEAL_BY_KEY = new Map(MEALS.map((entry) => [entry.key, entry]));
const SLOT_BY_KEY = new Map(
	PLANS.flatMap((plan) =>
		plan.slots.map((planSlot) => [planSlot.key, planSlot] as const)
	)
);

function requireFood(foodKey: string): SeedFood {
	const source = FOOD_BY_KEY.get(foodKey);
	if (!source) {
		throw new Error(`Unknown food key: "${foodKey}"`);
	}
	return source;
}

/**
 * `meal.total_*` through the same function the API uses, so the seeded
 * aggregates cannot drift from what the app would recompute.
 */
function mealTotalColumns(lines: readonly SeedMealLine[]) {
	const totals = computeMealTotalsFromLineItems(
		lines.map((entry) => {
			const source = requireFood(entry.foodKey);
			return {
				calories: Number(source.calories),
				carbs: Number(source.carbs),
				fat: Number(source.fat),
				protein: Number(source.protein),
				quantity: Number(entry.quantity),
				unit: source.unit,
			};
		})
	);
	return mealMacroTotalsToMealColumns(totals);
}

interface MealSeedResult {
	mealIds: Map<string, string>;
	/** Keyed `"<mealKey>:<foodKey>"`, the identity of one authored meal line. */
	mealItemIds: Map<string, string>;
}

async function seedMeals(
	foodIds: ReadonlyMap<string, string>
): Promise<MealSeedResult> {
	const now = new Date();
	const mealIds = new Map(
		MEALS.map((entry) => [entry.key, demoId("meal", entry.key)])
	);

	await db
		.insert(meal)
		.values(
			MEALS.map((entry) => ({
				description: entry.description,
				id: requireId(mealIds, entry.key, "meal"),
				name: entry.name,
				updatedAt: now,
				...mealTotalColumns(entry.lines),
			}))
		)
		.onConflictDoUpdate({
			target: meal.id,
			set: {
				description: sql`excluded.description`,
				name: sql`excluded.name`,
				totalCalories: sql`excluded.total_calories`,
				totalCarbs: sql`excluded.total_carbs`,
				totalFat: sql`excluded.total_fat`,
				totalProtein: sql`excluded.total_protein`,
				updatedAt: sql`excluded.updated_at`,
			},
		});

	const mealItemIds = new Map<string, string>();
	const itemValues = MEALS.flatMap((entry) =>
		entry.lines.map((entryLine) => {
			const lineKey = `${entry.key}:${entryLine.foodKey}`;
			const id = demoId("meal-item", lineKey);
			mealItemIds.set(lineKey, id);
			return {
				foodItemId: requireId(foodIds, entryLine.foodKey, "food item"),
				id,
				mealId: requireId(mealIds, entry.key, "meal"),
				quantity: entryLine.quantity,
			};
		})
	);

	await pruneStaleRows(
		mealItem,
		mealItem.id,
		inArray(mealItem.mealId, [...mealIds.values()]),
		[...mealItemIds.values()]
	);

	for (const batch of chunk(itemValues, INSERT_BATCH_SIZE)) {
		await db
			.insert(mealItem)
			.values(batch)
			.onConflictDoUpdate({
				target: mealItem.id,
				set: {
					foodItemId: sql`excluded.food_item_id`,
					mealId: sql`excluded.meal_id`,
					quantity: sql`excluded.quantity`,
				},
			});
	}

	return { mealIds, mealItemIds };
}

interface PlanSeedResult {
	planIds: Map<string, string>;
	/** Keyed by the slot's own key, holding its `diet_plan_meal.id`. */
	slotIds: Map<string, string>;
}

async function seedPlans(
	mealIds: ReadonlyMap<string, string>
): Promise<PlanSeedResult> {
	const now = new Date();
	const planIds = new Map(
		PLANS.map((plan) => [plan.key, demoId("diet-plan", plan.key)])
	);

	await db
		.insert(dietPlan)
		.values(
			PLANS.map((plan) => ({
				description: plan.description,
				id: requireId(planIds, plan.key, "diet plan"),
				name: plan.name,
				updatedAt: now,
			}))
		)
		.onConflictDoUpdate({
			target: dietPlan.id,
			set: {
				description: sql`excluded.description`,
				name: sql`excluded.name`,
				updatedAt: sql`excluded.updated_at`,
			},
		});

	const slotIds = new Map<string, string>();
	const slotValues = PLANS.flatMap((plan) =>
		plan.slots.map((planSlot) => {
			const id = demoId("diet-plan-meal", planSlot.key);
			slotIds.set(planSlot.key, id);
			return {
				dayNumber: planSlot.dayNumber,
				dietPlanId: requireId(planIds, plan.key, "diet plan"),
				id,
				mealId: requireId(mealIds, planSlot.mealKey, "meal"),
				mealOrder: planSlot.mealOrder,
				mealType: planSlot.mealType,
				scheduledTime: planSlot.scheduledTime,
			};
		})
	);

	await pruneStaleRows(
		dietPlanMeal,
		dietPlanMeal.id,
		inArray(dietPlanMeal.dietPlanId, [...planIds.values()]),
		[...slotIds.values()]
	);

	await db
		.insert(dietPlanMeal)
		.values(slotValues)
		.onConflictDoUpdate({
			target: dietPlanMeal.id,
			set: {
				dayNumber: sql`excluded.day_number`,
				dietPlanId: sql`excluded.diet_plan_id`,
				mealId: sql`excluded.meal_id`,
				mealOrder: sql`excluded.meal_order`,
				mealType: sql`excluded.meal_type`,
				scheduledTime: sql`excluded.scheduled_time`,
			},
		});

	return { planIds, slotIds };
}

/**
 * Assignments are always `member_id`-shaped here — the table's XOR CHECK allows
 * a bare `user_id` too, but an assignment naming a user belongs to no
 * organization and is invisible to every org-scoped screen.
 */
async function seedAssignments(
	memberIds: ReadonlyMap<string, string>,
	planIds: ReadonlyMap<string, string>
): Promise<Map<string, string>> {
	const assignmentIds = new Map(
		ASSIGNMENTS.map((row) => [
			row.userKey,
			demoId("assignment", `${row.userKey}:${row.planKey}`),
		])
	);

	await pruneStaleRows(
		dietPlanAssignment,
		dietPlanAssignment.id,
		inArray(dietPlanAssignment.memberId, [...memberIds.values()]),
		[...assignmentIds.values()]
	);

	await db
		.insert(dietPlanAssignment)
		.values(
			ASSIGNMENTS.map((row) => ({
				dietPlanId: requireId(planIds, row.planKey, "diet plan"),
				endDate: dayOffset(row.endOffset),
				id: requireId(assignmentIds, row.userKey, "assignment"),
				memberId: requireId(memberIds, row.userKey, "member"),
				startDate: dayOffset(row.startOffset),
			}))
		)
		.onConflictDoUpdate({
			target: dietPlanAssignment.id,
			set: {
				dietPlanId: sql`excluded.diet_plan_id`,
				endDate: sql`excluded.end_date`,
				memberId: sql`excluded.member_id`,
				startDate: sql`excluded.start_date`,
			},
		});

	return assignmentIds;
}

interface ConsumptionCounts {
	consumptions: number;
	items: number;
}

/**
 * Logged meals plus the snapshot of what was on the plate.
 *
 * `(assignment, diet_plan_meal, consumed_date)` is UNIQUE, and the id derives
 * from exactly that triple, so a same-day re-run updates in place. Because the
 * whole dataset is anchored on "today", a run on a later day mints a fresh
 * window and prunes the previous one.
 */
async function seedConsumptions(
	assignmentIds: ReadonlyMap<string, string>,
	slotIds: ReadonlyMap<string, string>,
	foodIds: ReadonlyMap<string, string>
): Promise<ConsumptionCounts> {
	const consumptionValues = CONSUMPTION_RUNS.flatMap((run) =>
		run.dayOffsets.map((offset) => ({
			consumedAt: timestampAt(offset, run.hour, run.minute),
			consumedDate: dayOffset(offset),
			dietPlanAssignmentId: requireId(assignmentIds, run.userKey, "assignment"),
			dietPlanMealId: requireId(slotIds, run.slotKey, "diet plan meal"),
			id: demoId(
				"consumption",
				`${run.userKey}:${run.slotKey}:${dayOffset(offset)}`
			),
			slotKey: run.slotKey,
		}))
	);

	await pruneStaleRows(
		dietPlanMealConsumption,
		dietPlanMealConsumption.id,
		inArray(dietPlanMealConsumption.dietPlanAssignmentId, [
			...assignmentIds.values(),
		]),
		consumptionValues.map((row) => row.id)
	);

	for (const batch of chunk(consumptionValues, INSERT_BATCH_SIZE)) {
		await db
			.insert(dietPlanMealConsumption)
			.values(batch.map(({ slotKey: _slotKey, ...row }) => row))
			.onConflictDoUpdate({
				target: dietPlanMealConsumption.id,
				set: {
					consumedAt: sql`excluded.consumed_at`,
					consumedDate: sql`excluded.consumed_date`,
				},
			});
	}

	const itemValues = consumptionValues.flatMap((row) => {
		const planSlot = SLOT_BY_KEY.get(row.slotKey);
		const source = planSlot ? MEAL_BY_KEY.get(planSlot.mealKey) : undefined;
		if (!source) {
			throw new Error(`No meal behind consumption slot "${row.slotKey}"`);
		}
		return source.lines.map((entryLine) => ({
			dietPlanMealConsumptionId: row.id,
			foodItemId: requireId(foodIds, entryLine.foodKey, "food item"),
			id: demoId("consumption-item", `${row.id}:${entryLine.foodKey}`),
			quantity: entryLine.quantity,
		}));
	});

	await pruneStaleRows(
		dietPlanMealConsumptionItem,
		dietPlanMealConsumptionItem.id,
		inArray(
			dietPlanMealConsumptionItem.dietPlanMealConsumptionId,
			consumptionValues.map((row) => row.id)
		),
		itemValues.map((row) => row.id)
	);

	for (const batch of chunk(itemValues, INSERT_BATCH_SIZE)) {
		await db
			.insert(dietPlanMealConsumptionItem)
			.values(batch)
			.onConflictDoUpdate({
				target: dietPlanMealConsumptionItem.id,
				set: {
					foodItemId: sql`excluded.food_item_id`,
					quantity: sql`excluded.quantity`,
				},
			});
	}

	return { consumptions: consumptionValues.length, items: itemValues.length };
}

async function seedOverrides(
	assignmentIds: ReadonlyMap<string, string>,
	slotIds: ReadonlyMap<string, string>,
	mealItemIds: ReadonlyMap<string, string>,
	foodIds: ReadonlyMap<string, string>
): Promise<number> {
	const now = new Date();
	const values = OVERRIDES.map((row) => {
		const planSlot = SLOT_BY_KEY.get(row.slotKey);
		if (!planSlot) {
			throw new Error(`Unknown plan slot: "${row.slotKey}"`);
		}
		const lineKey = `${planSlot.mealKey}:${row.replacesFoodKey}`;
		return {
			dietPlanAssignmentId: requireId(assignmentIds, row.userKey, "assignment"),
			dietPlanMealId: requireId(slotIds, row.slotKey, "diet plan meal"),
			effectiveDates: dateRange(row.startOffset, row.endOffset),
			foodItemId: requireId(foodIds, row.foodKey, "food item"),
			id: demoId(
				"override",
				`${row.userKey}:${row.slotKey}:${row.replacesFoodKey}:${row.foodKey}`
			),
			intentScope: row.intentScope,
			intentStartDate: dayOffset(row.startOffset),
			mealItemId: requireId(mealItemIds, lineKey, "meal item"),
			quantity: row.quantity,
			updatedAt: now,
		};
	});

	await pruneStaleRows(
		dietPlanMealItemOverride,
		dietPlanMealItemOverride.id,
		inArray(dietPlanMealItemOverride.dietPlanAssignmentId, [
			...assignmentIds.values(),
		]),
		values.map((row) => row.id)
	);

	await db
		.insert(dietPlanMealItemOverride)
		.values(values)
		.onConflictDoUpdate({
			target: dietPlanMealItemOverride.id,
			set: {
				effectiveDates: sql`excluded.effective_dates`,
				foodItemId: sql`excluded.food_item_id`,
				intentScope: sql`excluded.intent_scope`,
				intentStartDate: sql`excluded.intent_start_date`,
				quantity: sql`excluded.quantity`,
				updatedAt: sql`excluded.updated_at`,
			},
		});

	return values.length;
}

// ===========================================================================
// ENTRY POINT
// ===========================================================================

const ORG_NAME_BY_KEY = new Map(
	ORGANIZATIONS.map((org) => [org.key, org.name])
);
const NO_VALUE = "—";

function pad(value: string, width: number): string {
	return value.padEnd(width);
}

/** The copy-pasteable credentials table this seeder exists to hand over. */
function printCredentials(): void {
	const header = [
		pad("EMAIL", 34),
		pad("PASSWORD", 13),
		pad("user.role", 14),
		pad("member.role", 14),
		"organization",
	].join(" ");

	console.info(`\n${header}`);
	console.info("-".repeat(header.length));
	for (const person of USERS) {
		console.info(
			[
				pad(person.email, 34),
				pad(DEMO_PASSWORD, 13),
				pad(person.appRole, 14),
				pad(person.orgRole ?? NO_VALUE, 14),
				person.orgKey
					? (ORG_NAME_BY_KEY.get(person.orgKey) ?? NO_VALUE)
					: NO_VALUE,
			].join(" ")
		);
	}
}

function printCounts(counts: ReadonlyArray<readonly [string, number]>): void {
	console.info("\nRows declared by this seeder:");
	for (const [label, value] of counts) {
		console.info(`  ${pad(label, 32)} ${value}`);
	}
}

async function main(): Promise<void> {
	console.info(`Seeding demo data (today = ${dayOffset(0)} UTC)…`);

	const categoryIds = await seedFoodCategories();
	const foodIds = await seedFoodItems();
	const foodCategoryLinks = await seedFoodItemCategories(foodIds, categoryIds);

	const orgIds = await seedOrganizations();
	const userIds = await seedUsers();
	const memberIds = await seedMembers(userIds, orgIds);
	const assessmentCount = await seedAssessments(memberIds, userIds);

	const { mealIds, mealItemIds } = await seedMeals(foodIds);
	const { planIds, slotIds } = await seedPlans(mealIds);
	const assignmentIds = await seedAssignments(memberIds, planIds);
	const consumption = await seedConsumptions(assignmentIds, slotIds, foodIds);
	const overrideCount = await seedOverrides(
		assignmentIds,
		slotIds,
		mealItemIds,
		foodIds
	);

	printCounts([
		["food_category", categoryIds.size],
		["food_item", foodIds.size],
		["food_item_category", foodCategoryLinks],
		["organization", orgIds.size],
		["user", userIds.size],
		["account", userIds.size],
		["member", memberIds.size],
		["body_composition_assessment", assessmentCount],
		["meal", mealIds.size],
		["meal_item", mealItemIds.size],
		["diet_plan", planIds.size],
		["diet_plan_meal", slotIds.size],
		["diet_plan_assignment", assignmentIds.size],
		["diet_plan_meal_consumption", consumption.consumptions],
		["diet_plan_meal_consumption_item", consumption.items],
		["diet_plan_meal_item_override", overrideCount],
	]);
	printCredentials();
	console.info("\nDemo seed complete.");
}

try {
	await main();
	process.exit(0);
} catch (error) {
	console.error("Demo seeding failed:", error);
	process.exit(1);
}
