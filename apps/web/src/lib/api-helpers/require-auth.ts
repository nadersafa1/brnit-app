import { auth } from '@burn-app/auth'
import { NextResponse } from 'next/server'

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export type RequireAuthResult =
  | { error: NextResponse; session?: never }
  | { session: Session; error?: never }

export async function requireAuth(headers: Headers): Promise<RequireAuthResult> {
  const session = await auth.api.getSession({ headers })

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { session }
}
