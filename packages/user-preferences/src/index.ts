import { z } from 'zod'

/** Bump when new required preference keys are added (keep app and API in sync). */
export const CURRENT_PREFS_SCHEMA_VERSION = 1

export const lengthUnitEnum = z.enum(['metric', 'imperial'])
export type LengthUnit = z.infer<typeof lengthUnitEnum>

/** Stored in centimeters; optional so staff roles without assessments need not set it. */
const heightCmField = z.number().min(40).max(272)

const questionnaireEntrySchema = z.union([z.string(), z.array(z.string())])

/** Onboarding and other keyed answers (string or string[] per key). */
export const questionnaireSchema = z.record(z.string(), questionnaireEntrySchema)

export const userPreferencesDataSchema = z.object({
  lengthUnit: lengthUnitEnum,
  heightCm: heightCmField.optional(),
  questionnaire: questionnaireSchema.optional(),
})

export type UserPreferencesData = z.infer<typeof userPreferencesDataSchema>
export type QuestionnaireAnswers = z.infer<typeof questionnaireSchema>

export const REQUIRED_PREFERENCE_KEYS = ['lengthUnit'] as const
export type RequiredPreferenceKey = (typeof REQUIRED_PREFERENCE_KEYS)[number]

export const patchUserPreferencesBodySchema = z.object({
  preferences: userPreferencesDataSchema.partial(),
})

export type PatchUserPreferencesBody = z.infer<typeof patchUserPreferencesBodySchema>

export function defaultPreferences(): UserPreferencesData {
  return { lengthUnit: 'metric', questionnaire: {} }
}

/** BMI from metric height (cm) and weight (kg). Rounded to 2 decimal places. */
export function computeBmiFromMetric(heightCm: number, weightKg: number): number {
  const hM = heightCm / 100
  if (!(hM > 0) || weightKg < 0 || !Number.isFinite(weightKg)) {
    throw new RangeError('invalid height or weight for BMI')
  }
  const raw = weightKg / (hM * hM)
  return Math.round(raw * 100) / 100
}

export function mergePreferenceRecords(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...base, ...patch }
  const pQ = patch.questionnaire
  if (
    pQ !== undefined &&
    pQ !== null &&
    typeof pQ === 'object' &&
    !Array.isArray(pQ)
  ) {
    const bQ = base.questionnaire
    const prevRec =
      bQ !== undefined &&
      bQ !== null &&
      typeof bQ === 'object' &&
      !Array.isArray(bQ)
        ? { ...(bQ as Record<string, unknown>) }
        : {}
    next.questionnaire = { ...prevRec, ...(pQ as Record<string, unknown>) }
  }
  return next
}

export function effectivePreferences(stored: Record<string, unknown>): UserPreferencesData {
  const qRaw = stored.questionnaire
  const sanitizedQuestionnaire: Record<string, string | string[]> = {}
  if (
    qRaw !== undefined &&
    qRaw !== null &&
    typeof qRaw === 'object' &&
    !Array.isArray(qRaw)
  ) {
    for (const [k, v] of Object.entries(qRaw as Record<string, unknown>)) {
      const r = questionnaireEntrySchema.safeParse(v)
      if (r.success) sanitizedQuestionnaire[k] = r.data
    }
  }
  return userPreferencesDataSchema.parse({
    ...defaultPreferences(),
    ...stored,
    questionnaire: {
      ...defaultPreferences().questionnaire,
      ...sanitizedQuestionnaire,
    },
  })
}

export function computePreferenceCompletion(stored: Record<string, unknown>): {
  needsAttention: boolean
  missingKeys: string[]
} {
  const missing: string[] = []
  for (const key of REQUIRED_PREFERENCE_KEYS) {
    if (!(key in stored) || stored[key] === undefined || stored[key] === null) {
      missing.push(key)
      continue
    }
    const fieldSchema = userPreferencesDataSchema.shape[key as keyof UserPreferencesData]
    if (!fieldSchema.safeParse(stored[key]).success) {
      missing.push(key)
    }
  }
  return { needsAttention: missing.length > 0, missingKeys: missing }
}
