/**
 * Server-backed prefs in Postgres (`user_preferences.preferences` jsonb).
 * After sign-in, `bootstrap` PATCHes onboarding draft: top-level `lengthUnit` plus
 * `questionnaire` (all other keys from SecureStore `onboardingAnswers`).
 */
import type { UserPreferencesData } from '@burn-app/user-preferences'
import { create } from 'zustand'

import { getUserPreferences, patchUserPreferences } from '@/lib/api/user-preferences'
import { useAppSettingsStore } from '@/store/app-settings-store'

export type UserPreferencesBootstrapStatus = 'idle' | 'loading' | 'ready' | 'error'

type UserPreferencesState = {
  status: UserPreferencesBootstrapStatus
  preferences: UserPreferencesData | null
  needsCatchUp: boolean
  errorMessage: string | null
  bootstrapForUserId: string | null
  reset: () => void
  bootstrap: (userId: string) => Promise<void>
  patchPreferences: (prefs: Partial<UserPreferencesData>) => Promise<void>
  applyFromServer: (data: Awaited<ReturnType<typeof getUserPreferences>>) => void
}

function isLengthUnitDraft(v: unknown): v is 'metric' | 'imperial' {
  return v === 'metric' || v === 'imperial'
}

/** Build API patch from SecureStore onboarding answers (flat map). */
function preferencePatchFromOnboardingDraft(
  answers: Record<string, string | string[]>
): Pick<UserPreferencesData, 'lengthUnit'> & { questionnaire?: Record<string, string | string[]> } {
  const lengthUnit = isLengthUnitDraft(answers.lengthUnit) ? answers.lengthUnit : 'metric'
  const questionnaire: Record<string, string | string[]> = { ...answers }
  delete questionnaire.lengthUnit
  const keys = Object.keys(questionnaire)
  return keys.length > 0 ? { lengthUnit, questionnaire } : { lengthUnit }
}

export const useUserPreferencesStore = create<UserPreferencesState>((set, get) => ({
  status: 'idle',
  preferences: null,
  needsCatchUp: false,
  errorMessage: null,
  bootstrapForUserId: null,

  reset: () => {
    set({
      status: 'idle',
      preferences: null,
      needsCatchUp: false,
      errorMessage: null,
      bootstrapForUserId: null,
    })
  },

  applyFromServer: (data) => {
    set({
      preferences: data.preferences,
      needsCatchUp: data.needsCatchUp,
      errorMessage: null,
    })
  },

  bootstrap: async (userId: string) => {
    const state = get()
    if (state.bootstrapForUserId === userId && state.status === 'ready') {
      return
    }

    set({ status: 'loading', errorMessage: null, bootstrapForUserId: userId })

    try {
      const appSettings = useAppSettingsStore.getState()
      const answers = appSettings.onboardingAnswers
      const syncedFor = appSettings.preferencesDraftSyncedForUserId

      const hasDraft = Object.keys(answers).length > 0
      if (hasDraft && syncedFor !== userId) {
        try {
          const prefs = preferencePatchFromOnboardingDraft(answers)
          const patched = await patchUserPreferences({ preferences: prefs })
          useAppSettingsStore.getState().markPreferencesDraftSyncedForUser(userId)
          set({
            status: 'ready',
            preferences: patched.preferences,
            needsCatchUp: patched.needsCatchUp,
          })
          return
        } catch {
          // Fall through to GET so a transient PATCH failure does not block the app.
        }
      }

      const data = await getUserPreferences()
      set({
        status: 'ready',
        preferences: data.preferences,
        needsCatchUp: data.needsCatchUp,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not load preferences'
      set({ status: 'error', errorMessage: message })
    }
  },

  patchPreferences: async (prefs) => {
    const data = await patchUserPreferences({ preferences: prefs })
    set({
      preferences: data.preferences,
      needsCatchUp: data.needsCatchUp,
    })
  },
}))
