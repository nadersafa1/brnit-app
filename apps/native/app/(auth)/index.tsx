import { Redirect } from 'expo-router'
import { View, StyleSheet } from 'react-native'

import { Spinner } from '@/components/ui'
import { authClient } from '@/lib/auth-client'
import { useColors } from '@/hooks/use-theme-color'

export default function AuthScreen() {
  const colors = useColors()
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <View style={[styles.container, { backgroundColor: colors.appBg }]}>
        <Spinner size='lg' />
      </View>
    )
  }

  if (session?.user) {
    if (!session.user.dob) {
      return <Redirect href='/(auth)/complete-profile' />
    }
    return <Redirect href='/' />
  }

  return <Redirect href='/(auth)/login' />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
