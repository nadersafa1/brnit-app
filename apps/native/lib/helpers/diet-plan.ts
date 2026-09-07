import type { CurrentDietPlanDayDto, CurrentDietPlanDto } from "@brnit/api";

/** Resolves one day out of the member Home read. */
export function getDayForDate(
	data: CurrentDietPlanDto | undefined,
	dateStr: string
): CurrentDietPlanDayDto | undefined {
	if (!data?.data) {
		return;
	}
	return data.data.days.find((day) => day.date === dateStr);
}
