import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const STORAGE_KEY = 'brnit_app_settings'

type AppSettings = {
  isOnboarded: boolean
  seenFeatures: Record<string, boolean>
  onboardingAnswers: Record<string, string | string[]>
}

type AppSettingsActions = {
  setIsOnboarded: (value: boolean) => void
  setSeenFeature: (feature: string, value: boolean) => void
  updateOnboardingAnswers: (answers: Record<string, string | string[]>) => void
  resetSettings: () => void
}

type AppSettingsStore = AppSettings & AppSettingsActions

const DEFAULT_SETTINGS: AppSettings = {
  isOnboarded: false,
  seenFeatures: {},
  onboardingAnswers: {},
}

function loadSettingsSync(): AppSettings {
  try {
    const stored = SecureStore.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AppSettings>
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch (error) {
    console.error('[AppSettings] Failed to load settings:', error)
  }
  return DEFAULT_SETTINGS
}

function persistSettings(settings: AppSettings): void {
  SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings)).catch(
    (error) => {
      console.error('[AppSettings] Failed to persist settings:', error)
    }
  )
}

export const useAppSettingsStore = create<AppSettingsStore>((set, get) => ({
  ...loadSettingsSync(),

  setIsOnboarded: (value) => {
    set({ isOnboarded: value })
    persistSettings(get())
  },

  setSeenFeature: (feature, value) => {
    set((state) => ({
      seenFeatures: { ...state.seenFeatures, [feature]: value },
    }))
    persistSettings(get())
  },

  updateOnboardingAnswers: (answers) => {
    set((state) => ({
      onboardingAnswers: { ...state.onboardingAnswers, ...answers },
    }))
    persistSettings(get())
  },

  resetSettings: () => {
    set(DEFAULT_SETTINGS)
    SecureStore.deleteItemAsync(STORAGE_KEY).catch((error) => {
      console.error('[AppSettings] Failed to delete settings:', error)
    })
  },
}))

export const useIsOnboarded = () =>
  useAppSettingsStore((state) => state.isOnboarded)

export const useSeenFeature = (feature: string) =>
  useAppSettingsStore((state) => state.seenFeatures[feature] ?? false)
