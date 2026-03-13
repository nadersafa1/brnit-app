import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useColorScheme, Appearance } from 'react-native'

type ThemeName = 'light' | 'dark'

type AppThemeContextType = {
  currentTheme: ThemeName
  isLight: boolean
  isDark: boolean
  setTheme: (theme: ThemeName) => void
  toggleTheme: () => void
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined)

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme()
  const [overrideTheme, setOverrideTheme] = useState<ThemeName | null>(null)

  const systemTheme: ThemeName = systemColorScheme === 'dark' ? 'dark' : 'light'
  const currentTheme: ThemeName = overrideTheme ?? systemTheme

  const isLight = currentTheme === 'light'
  const isDark = currentTheme === 'dark'

  const setTheme = useCallback((newTheme: ThemeName) => {
    setOverrideTheme(newTheme)
    Appearance.setColorScheme(newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }, [currentTheme, setTheme])

  const value = useMemo(
    () => ({
      currentTheme,
      isLight,
      isDark,
      setTheme,
      toggleTheme,
    }),
    [currentTheme, isLight, isDark, setTheme, toggleTheme]
  )

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
}

export function useAppTheme() {
  const context = useContext(AppThemeContext)
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider')
  }
  return context
}
