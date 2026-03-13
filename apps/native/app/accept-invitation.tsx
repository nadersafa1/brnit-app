'use client'

import { Redirect, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'

import { Spinner, Text } from '@/components/ui'
import { authClient } from '@/lib/auth-client'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'

const AcceptInvitationScreen = () => {
  const colors = useColors()
  const { invitationId } = useLocalSearchParams<{ invitationId?: string }>()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

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
          params: { invitationId },
        }}
      />
    )
  }

  if (status === 'done') {
    return <Redirect href='/(tabs)' />
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <View style={[styles.container, { backgroundColor: colors.appBg }]}>
        <Spinner size='lg' />
        <Text muted style={styles.text}>
          Joining organization…
        </Text>
      </View>
    )
  }

  return <Redirect href='/(tabs)' />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: spacing[4],
  },
})

export default AcceptInvitationScreen
