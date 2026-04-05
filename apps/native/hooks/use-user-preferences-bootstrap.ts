import { useEffect } from 'react'

import { useUserPreferencesStore } from '@/store/user-preferences-store'

/**
 * Loads and syncs user preferences when `userId` is set; resets when cleared (e.g. sign-out).
 */
export function useUserPreferencesBootstrap(userId: string | undefined) {
  const reset = useUserPreferencesStore((s) => s.reset)
  const bootstrap = useUserPreferencesStore((s) => s.bootstrap)
  const status = useUserPreferencesStore((s) => s.status)
  const needsCatchUp = useUserPreferencesStore((s) => s.needsCatchUp)
  const errorMessage = useUserPreferencesStore((s) => s.errorMessage)

  useEffect(() => {
    if (!userId) {
      const s = useUserPreferencesStore.getState()
      const pristine =
        s.status === 'idle' &&
        s.preferences === null &&
        s.bootstrapForUserId === null &&
        !s.needsCatchUp &&
        s.errorMessage === null
      if (!pristine) reset()
      return
    }
    void bootstrap(userId)
  }, [userId, bootstrap, reset])

  return { status, needsCatchUp, errorMessage }
}
