import type { DbTransaction } from "@brnit/db";
import {
	computeMealTotalsFromLineItems,
	mealMacroTotalsToMealColumns,
	mealTotalsLinesFromDbRows,
} from "@brnit/db/meal-totals";
import { foodItem, meal, mealItem } from "@brnit/db/schema";
import { eq } from "drizzle-orm";

/**
 * Rebuilds `meal.total_*` from the meal's current `meal_item` rows.
 *
 * **Must run inside the same transaction as the line mutation that triggered
 * it.** The four `total_*` columns are application-maintained aggregates with
 * no trigger behind them, so a write path that commits lines without
 * recomputing leaves the meal permanently wrong — and nothing in the schema
 * will ever notice.
 *
 * The arithmetic is not re-implemented here: `@brnit/db/meal-totals` sums the
 * raw floats and rounds each macro exactly once at the end, which is what keeps
 * the persisted totals equal to the summary the meal detail page renders.
 * Rounding per line, or switching to the member-facing `roundUpToTenth` rule,
 * would break that parity.
 *
 * Takes a {@link DbTransaction} rather than the `db` singleton so the type
 * system enforces the transaction requirement at every call site.
 */
export async function recomputeMealTotals(
	tx: DbTransaction,
	mealId: string
): Promise<void> {
	const rows = await tx
		.select({
			calories: foodItem.calories,
			carbs: foodItem.carbs,
			fat: foodItem.fat,
			protein: foodItem.protein,
			quantity: mealItem.quantity,
			unit: foodItem.unit,
		})
		.from(mealItem)
		.innerJoin(foodItem, eq(mealItem.foodItemId, foodItem.id))
		.where(eq(mealItem.mealId, mealId));

	const totals = computeMealTotalsFromLineItems(mealTotalsLinesFromDbRows(rows));

	await tx
		.update(meal)
		.set(mealMacroTotalsToMealColumns(totals))
		.where(eq(meal.id, mealId));
}
