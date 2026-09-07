import type { CurrentDietPlanDayDto, CurrentDietPlanMealDto } from "@brnit/api";
import { sumMacros, ZERO_MACROS } from "@brnit/api/member/macros";
import { roundUpToTenth } from "@brnit/domain";
import { useMemo } from "react";

/**
 * Daily progress for the Home progress card: consumed against the day's goals,
 * plus the calories still available.
 *
 * `sumMacros` is the server's own aggregation helper, so the numbers here match
 * what the API computed for the same day — rounded **up to the nearest tenth at
 * every step**, which is the member-facing rule. Do not swap it for a raw sum
 * with a single rounding at the end.
 */
export function useDayProgress(
	day: CurrentDietPlanDayDto | undefined,
	meals: CurrentDietPlanMealDto[]
) {
	return useMemo(() => {
		const consumedMacros = sumMacros(
			meals.filter((meal) => meal.consumed).map((meal) => meal.macros)
		);
		const goals = day?.macros ?? ZERO_MACROS;

		const caloriesGoal = roundUpToTenth(goals.calories);
		const caloriesConsumed = roundUpToTenth(consumedMacros.calories);

		return {
			consumedMacros,
			caloriesGoal,
			caloriesConsumed,
			remainingCalories: Math.max(0, caloriesGoal - caloriesConsumed),
			proteinGoal: roundUpToTenth(goals.protein),
			proteinConsumed: roundUpToTenth(consumedMacros.protein),
			carbsGoal: roundUpToTenth(goals.carbs),
			carbsConsumed: roundUpToTenth(consumedMacros.carbs),
			fatGoal: roundUpToTenth(goals.fat),
			fatConsumed: roundUpToTenth(consumedMacros.fat),
			hasPlan: Boolean(day && meals.length > 0),
		};
	}, [day, meals]);
}
