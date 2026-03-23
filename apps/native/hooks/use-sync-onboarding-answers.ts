import { useEffect, useRef } from 'react'
import { useAppSettingsStore } from '@/store/app-settings-store'
import { syncOnboardingAnswers } from '@/lib/api/onboarding-answers'
import { authClient } from '@/lib/auth-client'

/**
 * Syncs local onboarding answers to the backend once per session after login.
 * Should be mounted in a component that renders only when the user is authenticated.
 */
export function useSyncOnboardingAnswers() {
  const hasSynced = useRef(false)
  const answers = useAppSettingsStore((s) => s.onboardingAnswers)
  const { data: session } = authClient.useSession()

  useEffect(() => {
    if (hasSynced.current) return
    if (!session?.user) return

    const hasAnswers = Object.keys(answers).length > 0
    if (!hasAnswers) return

    hasSynced.current = true
    syncOnboardingAnswers(answers).catch((err) => {
      hasSynced.current = false
      console.warn('[Onboarding] Failed to sync answers:', err)
    })
  }, [session, answers])
}
