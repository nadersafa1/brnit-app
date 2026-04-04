import type { NativeAuthClient } from '@/lib/auth-client'
import { getAppleIdentityTokenForAuth } from '@/lib/apple-sign-in'
import { createSocialSignInCallbacks } from '@/lib/auth-social-callbacks'

type SignInWithAppleParams = {
  setError: (message: string | null) => void
  setIsLoading: (loading: boolean) => void
  callbackURL: string
}

/**
 * Native Sign in with Apple: obtains an ID token from iOS, then exchanges it with Better Auth (no browser redirect).
 */
export async function signInWithAppleUsingBetterAuth(client: NativeAuthClient, params: SignInWithAppleParams) {
  const { setError, setIsLoading, callbackURL } = params
  setIsLoading(true)
  setError(null)

  const credential = await getAppleIdentityTokenForAuth()
  if (credential.kind === 'unavailable') {
    setError('Apple Sign In is not available on this device')
    setIsLoading(false)
    return
  }
  if (credential.kind === 'canceled') {
    setIsLoading(false)
    return
  }

  await client.signIn.social(
    {
      provider: 'apple',
      callbackURL,
      idToken: { token: credential.identityToken, nonce: credential.nonce },
    },
    createSocialSignInCallbacks(setError, setIsLoading, 'Apple sign-in failed'),
  )
}
