import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'

import { Spinner, Text } from '@/components/ui'
import { authClient } from '@/lib/auth-client'
import { useColors } from '@/hooks/use-theme-color'
import { showError, showSuccess } from '@/lib/feedback'
import { spacing } from '@/theme/spacing'

const REDIRECT_DELAY_MS = 1500

const AcceptInvitationScreen = () => {
  const colors = useColors()
  const router = useRouter()
  const { invitationId, email } = useLocalSearchParams<{ invitationId: string; email?: string }>()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  useEffect(() => {
    if (status === 'done') {
      showSuccess('You joined the organization')
      const t = setTimeout(() => router.replace('/(tabs)'), REDIRECT_DELAY_MS)
      return () => clearTimeout(t)
    }
    if (status === 'error') {
      showError('Could not join organization')
      const t = setTimeout(() => router.replace('/(tabs)'), REDIRECT_DELAY_MS)
      return () => clearTimeout(t)
    }
  }, [status, router])

  useEffect(() => {
    if (sessionPending || !invitationId) return
    if (!session?.user) return
    if (status !== 'idle') return

    setStatus('loading')
    authClient.organization
      .acceptInvitation({ invitationId })
      .then(async res => {
        if (res.error) {
          setStatus('error')
          return
        }
        const data = res.data as { organizationId?: string; organization?: { id: string } } | undefined
        const organizationId = data?.organizationId ?? data?.organization?.id
        if (organizationId) {
          const setActive = (
            authClient.organization as {
              setActiveOrganization?: (p: { organizationId: string }) => Promise<unknown>
            }
          ).setActiveOrganization
          if (setActive) await setActive({ organizationId })
        }
        setStatus('done')
      })
      .catch(() => setStatus('error'))
  }, [session, sessionPending, invitationId, status])

  if (!invitationId) {
    return <Redirect href='/(tabs)' />
  }

  if (!sessionPending && !session?.user) {
    return (
      <Redirect
        href={{
          pathname: '/(auth)/login',
          params: { invitationId, ...(email ? { email } : {}), callbackUrl: '/accept-invitation/[invitationId]' }
        }}
      />
    )
  }

  if (status === 'done') {
    return (
      <View style={[styles.container, { backgroundColor: colors.appBg }]}>
        <Text
          size='lg'
          weight='semibold'
        >
          Welcome aboard!
        </Text>
        <Text
          muted
          style={styles.text}
        >
          Redirecting…
        </Text>
      </View>
    )
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: colors.appBg }]}>
        <Text
          size='lg'
          weight='semibold'
        >
          Something went wrong
        </Text>
        <Text
          muted
          style={styles.text}
        >
          Redirecting…
        </Text>
      </View>
    )
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <View style={[styles.container, { backgroundColor: colors.appBg }]}>
        <Spinner size='lg' />
        <Text
          muted
          style={styles.text}
        >
          Joining organization…
        </Text>
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    marginTop: spacing[4]
  }
})

export default AcceptInvitationScreen
