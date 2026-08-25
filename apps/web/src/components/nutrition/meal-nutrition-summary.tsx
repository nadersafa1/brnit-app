import type { MealItemDto } from "@brnit/api";
import { Card, CardContent, CardHeader } from "@brnit/ui/components/card";

import {
	computeMacroTotals,
	formatMacro,
	type MacroTotals,
} from "@/components/nutrition/nutrition-macros";

interface MealNutritionSummaryProps {
	mealItems: readonly MealItemDto[];
	/**
	 * `meal.total_*` as the API returned it. Preferred over client maths so the
	 * card can never disagree with the row the list shows.
	 */
	storedTotals?: MacroTotals;
}

const MACRO_ROWS = [
	{ key: "calories", suffix: "kcal" },
	{ key: "protein", suffix: "g protein" },
	{ key: "carbs", suffix: "g carbs" },
	{ key: "fat", suffix: "g fat" },
] as const satisfies readonly { key: keyof MacroTotals; suffix: string }[];

/** The meal's four macros, from the persisted totals when they are available. */
export function MealNutritionSummary({
	mealItems,
	storedTotals,
}: Readonly<MealNutritionSummaryProps>) {
	const totals = storedTotals ?? computeMacroTotals(mealItems);

	return (
		<Card>
			<CardHeader>
				<h2 className="font-semibold text-sm">Nutrition summary</h2>
			</CardHeader>
			<CardContent>
				<dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					{MACRO_ROWS.map((row) => (
						<div key={row.key}>
							<dt className="text-muted-foreground text-xs">{row.suffix}</dt>
							<dd className="font-semibold text-lg tabular-nums">
								{formatMacro(totals[row.key])}
							</dd>
						</div>
					))}
				</dl>
			</CardContent>
		</Card>
	);
}
