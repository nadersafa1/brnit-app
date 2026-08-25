import { auth } from '@brnit/auth'
import { NextResponse } from 'next/server'

type AdminAuthResult =
  | { error: NextResponse; session?: never }
  | { session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>; error?: never }

export const requireAdmin = async (headers: Headers): Promise<AdminAuthResult> => {
  const session = await auth.api.getSession({ headers })

  if (!session?.user || session.user.role !== 'admin') {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { session }
}
