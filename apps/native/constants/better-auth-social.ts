/**
 * Value passed as Better Auth `signIn.social({ callbackURL })` on native.
 *
 * The server validates `callbackURL` against `trustedOrigins` and a relative-path pattern:
 * Expo Router paths like `/(tabs)` are rejected (parentheses are not allowed in that check).
 * For OAuth id-token flows the app does not follow this URL as a redirect; navigation after
 * session is handled in-screen (e.g. `<Redirect href="/(tabs)" />`).
 */
export const BETTER_AUTH_SOCIAL_CALLBACK_PATH = '/'
