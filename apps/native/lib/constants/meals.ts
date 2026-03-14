/**
 * Display-only constants and helpers for meals (icons, default times).
 * Meal times are placeholders when no schedule is provided.
 */

export const MEAL_TYPE_ICONS: Record<string, 'sunny-outline' | 'partly-sunny-outline' | 'cafe-outline' | 'moon-outline'> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  snack: 'cafe-outline',
  dinner: 'moon-outline'
}

/** Default display time for a meal type (placeholder). */
export function formatMealTime(mealType: string): string {
  const times: Record<string, string> = {
    breakfast: '8:00 AM',
    lunch: '12:30 PM',
    snack: '3:30 PM',
    dinner: '7:00 PM'
  }
  return times[mealType.toLowerCase()] ?? '12:00 PM'
}
