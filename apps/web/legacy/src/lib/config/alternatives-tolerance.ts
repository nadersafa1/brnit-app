const DEFAULT_PCT = 15
const MIN_PCT = 1
const MAX_PCT = 100

function parsePct(envKey: string, defaultValue: number): number {
  const raw = process.env[envKey]
  if (raw === undefined || raw === '') return defaultValue
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) return defaultValue
  return Math.max(MIN_PCT, Math.min(MAX_PCT, parsed))
}

export interface AlternativesToleranceConfig {
  caloriesPct: number
  proteinPct: number
  carbsPct: number
  fatPct: number
}

let cached: AlternativesToleranceConfig | null = null

export function getAlternativesToleranceConfig(): AlternativesToleranceConfig {
  if (cached) return cached
  cached = {
    caloriesPct: parsePct('ALTERNATIVES_TOLERANCE_CAL_PCT', DEFAULT_PCT),
    proteinPct: parsePct('ALTERNATIVES_TOLERANCE_PROTEIN_PCT', DEFAULT_PCT),
    carbsPct: parsePct('ALTERNATIVES_TOLERANCE_CARBS_PCT', DEFAULT_PCT),
    fatPct: parsePct('ALTERNATIVES_TOLERANCE_FAT_PCT', DEFAULT_PCT),
  }
  return cached
}

/** Reset cache (for tests only). */
export function resetAlternativesToleranceCache(): void {
  cached = null
}
