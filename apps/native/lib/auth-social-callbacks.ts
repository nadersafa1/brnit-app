/**
 * Shared Better Auth `signIn.social` / `signUp` callback shape for native email-password and OAuth flows.
 */

type AuthErrorCtx = { error?: { message?: string } }

export function createSocialSignInCallbacks(
  setError: (message: string | null) => void,
  setIsLoading: (loading: boolean) => void,
  failureMessage: string,
) {
  return {
    onError(err: AuthErrorCtx) {
      setError(err.error?.message || failureMessage)
      setIsLoading(false)
    },
    onSuccess() {
      setError(null)
    },
    onFinished() {
      setIsLoading(false)
    },
  }
}
