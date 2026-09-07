import type { DietPlanMealDto } from "@brnit/api";
import { Input } from "@brnit/ui/components/input";
import { Label } from "@brnit/ui/components/label";

const ALL_DAYS = 0;

interface MealTimeOverrideFieldsProps {
	disabled?: boolean;
	meals: readonly DietPlanMealDto[];
	onChange: (dietPlanMealId: string, value: string) => void;
	valuesByMealId: Readonly<Record<string, string>>;
}

function formatSlot(meal: DietPlanMealDto): string {
	const day =
		meal.dayNumber === ALL_DAYS ? "Every day" : `Day ${meal.dayNumber}`;
	return `${meal.mealType} · ${day}`;
}

/**
 * One optional local time per slot of the selected plan.
 *
 * Each field starts at the plan's own `scheduledTime`, so leaving the form
 * untouched sends nothing. **Clearing** a field is a real instruction — it
 * drops the assignment's override and lets the plan default apply again — which
 * is why the empty state is offered rather than the input being required.
 */
export function MealTimeOverrideFields({
	disabled = false,
	meals,
	onChange,
	valuesByMealId,
}: Readonly<MealTimeOverrideFieldsProps>) {
	if (meals.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				This plan has no meal slots yet, so there are no times to override.
			</p>
		);
	}

	return (
		<div className="max-h-56 space-y-3 overflow-y-auto rounded-xl bg-card-alt p-3">
			{meals.map((meal) => {
				const fieldId = `meal-time-${meal.id}`;
				return (
					<div
						className="grid grid-cols-[1fr_auto] items-center gap-3"
						key={meal.id}
					>
						<div className="min-w-0">
							<Label className="font-medium" htmlFor={fieldId}>
								{meal.mealName}
							</Label>
							<p className="text-muted-foreground text-xs capitalize">
								{formatSlot(meal)}
							</p>
						</div>
						<Input
							className="w-36"
							disabled={disabled}
							id={fieldId}
							onChange={(event) => onChange(meal.id, event.target.value)}
							type="time"
							value={valuesByMealId[meal.id] ?? ""}
						/>
					</div>
				);
			})}
		</div>
	);
}
