import { enqueueVerificationEmail } from '@burn-app/queue'
import type { User } from 'better-auth'

/** Adapts better-auth's hook signature to the transactional email queue. */
export async function sendVerificationEmail({ user, url }: { user: User; url: string }) {
  await enqueueVerificationEmail({ to: user.email, url })
}
