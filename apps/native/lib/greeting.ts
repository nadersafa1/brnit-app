/**
 * Maps the device local hour (0–23) to a greeting label and icon.
 * Used on the home header; thresholds follow common “time of day” conventions.
 */
export function getGreetingMeta(hour: number) {
  if (hour >= 5 && hour < 12) {
    return { label: 'Good morning', icon: 'sunny-outline' as const }
  }
  if (hour >= 12 && hour < 17) {
    return { label: 'Good afternoon', icon: 'partly-sunny-outline' as const }
  }
  if (hour >= 17 && hour < 22) {
    return { label: 'Good evening', icon: 'moon-outline' as const }
  }
  return { label: 'Good night', icon: 'moon' as const }
}
