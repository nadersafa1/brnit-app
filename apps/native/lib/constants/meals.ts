/**
 * Display-only constants and helpers for meals (icons, default times).
 * Meal times are placeholders when no schedule is provided.
 */

export const MEAL_TYPE_ICONS: Record<
	string,
	"sunny-outline" | "partly-sunny-outline" | "cafe-outline" | "moon-outline"
> = {
	breakfast: "sunny-outline",
	lunch: "partly-sunny-outline",
	snack: "cafe-outline",
	dinner: "moon-outline",
};

/** `HH:MM` on a 24-hour clock, as the API returns a slot time. */
const TWENTY_FOUR_HOUR_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Default display time for a meal type (placeholder). */
export function formatMealTime(
	mealType: string,
	scheduledTime?: string
): string {
	if (scheduledTime && TWENTY_FOUR_HOUR_TIME.test(scheduledTime)) {
		const [hourRaw, minute] = scheduledTime.split(":");
		const hour = Number(hourRaw);
		const suffix = hour >= 12 ? "PM" : "AM";
		const hour12 = hour % 12 === 0 ? 12 : hour % 12;
		return `${hour12}:${minute} ${suffix}`;
	}
	const times: Record<string, string> = {
		breakfast: "8:00 AM",
		lunch: "12:30 PM",
		snack: "3:30 PM",
		dinner: "7:00 PM",
	};
	return times[mealType.toLowerCase()] ?? "12:00 PM";
}
