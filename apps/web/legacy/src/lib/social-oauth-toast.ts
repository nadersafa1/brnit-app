import { toast } from 'sonner'

type OAuthErrorCtx = { error?: { message?: string } }

/** Consistent toast copy for Better Auth `signIn.social` failures. */
export function toastSocialOAuthError(ctx: OAuthErrorCtx, providerLabel: string) {
  toast.error(ctx.error?.message ?? `${providerLabel} sign-in failed`)
}
