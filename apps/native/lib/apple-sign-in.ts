import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { Platform } from 'react-native'

const REQUEST_CANCELED = 'ERR_REQUEST_CANCELED'

export type AppleSignInCredential =
  | { kind: 'ok'; identityToken: string; nonce: string }
  | { kind: 'unavailable' }
  | { kind: 'canceled' }

export async function getAppleIdentityTokenForAuth(): Promise<AppleSignInCredential> {
  if (Platform.OS !== 'ios') return { kind: 'unavailable' }

  const available = await AppleAuthentication.isAvailableAsync()
  if (!available) return { kind: 'unavailable' }

  const rawNonce = await Crypto.getRandomBytesAsync(16).then(bytes =>
    Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''),
  )
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  )

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    })
    if (!credential.identityToken) {
      throw new Error('Apple did not return an identity token')
    }
    return { kind: 'ok', identityToken: credential.identityToken, nonce: hashedNonce }
  } catch (e: unknown) {
    if (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: string }).code === REQUEST_CANCELED
    ) {
      return { kind: 'canceled' }
    }
    throw e
  }
}
