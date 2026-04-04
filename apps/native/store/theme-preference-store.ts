/**
 * User-selected appearance: explicit light/dark or follow OS (`system` → native `unspecified`).
 * Applies to `Appearance` on load (see initializer below) so the first paint matches the saved value.
 */
import * as SecureStore from 'expo-secure-store'
import { Appearance } from 'react-native'
import { create } from 'zustand'

const STORAGE_KEY = 'brnit_theme_preference'

export type ThemePreference = 'light' | 'dark' | 'system'

type ThemePreferenceState = {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

function loadPreferenceSync(): ThemePreference {
  try {
    const raw = SecureStore.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') {
      return raw
    }
  } catch (error) {
    console.error('[ThemePreference] Failed to load:', error)
  }
  return 'system'
}

function applyToNativeAppearance(preference: ThemePreference) {
  if (preference === 'system') {
    Appearance.setColorScheme('unspecified')
  } else {
    Appearance.setColorScheme(preference)
  }
}

const initialPreference = loadPreferenceSync()
applyToNativeAppearance(initialPreference)

export const useThemePreferenceStore = create<ThemePreferenceState>((set) => ({
  preference: initialPreference,

  setPreference: (preference) => {
    applyToNativeAppearance(preference)
    set({ preference })
    SecureStore.setItemAsync(STORAGE_KEY, preference).catch((error) => {
      console.error('[ThemePreference] Failed to persist:', error)
    })
  },
}))
