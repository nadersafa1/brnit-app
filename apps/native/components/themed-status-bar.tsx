import { StatusBar } from 'expo-status-bar'
import { useColorSchemeValue } from '@/hooks/use-theme-color'

export function ThemedStatusBar() {
  const scheme = useColorSchemeValue()
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
}
