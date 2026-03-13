import { Redirect } from 'expo-router'
import { ActivityIndicator, View, StyleSheet } from 'react-native'

import { authClient } from '@/lib/auth-client'
import { useColors } from '@/hooks/use-theme-color'

export default function AuthScreen() {
  const colors = useColors()
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <View style={[styles.container, { backgroundColor: colors.appBg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  if (session?.user) {
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/(auth)/login" />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
