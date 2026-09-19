import { enqueuePasswordResetEmail } from '@burn-app/queue'
import type { User } from 'better-auth'

/** Adapts better-auth's hook signature to the transactional email queue. */
export async function sendPasswordResetEmail({ user, url }: { user: User; url: string }) {
  await enqueuePasswordResetEmail({ to: user.email, url })
}
