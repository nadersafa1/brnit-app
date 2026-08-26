import { getAppleIdentityTokenForAuth } from "@/lib/apple-sign-in";
import type { NativeAuthClient } from "@/lib/auth-client";
import { createSocialSignInCallbacks } from "@/lib/auth-social-callbacks";

interface SignInWithAppleParams {
	callbackURL: string;
	setError: (message: string | null) => void;
	setIsLoading: (loading: boolean) => void;
}

/**
 * Native Sign in with Apple: obtains an ID token from iOS, then exchanges it with Better Auth (no browser redirect).
 */
export async function signInWithAppleUsingBetterAuth(
	client: NativeAuthClient,
	params: SignInWithAppleParams
) {
	const { setError, setIsLoading, callbackURL } = params;
	setIsLoading(true);
	setError(null);

	try {
		const credential = await getAppleIdentityTokenForAuth();
		if (credential.kind === "unavailable") {
			setError("Apple Sign In is not available on this device");
			return;
		}
		if (credential.kind === "canceled") {
			return;
		}

		await client.signIn.social(
			{
				provider: "apple",
				callbackURL,
				idToken: { token: credential.identityToken, nonce: credential.nonce },
			},
			createSocialSignInCallbacks(
				setError,
				setIsLoading,
				"Apple sign-in failed"
			)
		);
	} finally {
		setIsLoading(false);
	}
}
