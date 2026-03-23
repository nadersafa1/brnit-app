import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { db } from '@burn-app/db'
import { userOnboardingAnswers } from '@burn-app/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'
import { upsertOnboardingAnswersSchema } from '@/types/api/onboarding-answers.schemas'

export const dynamic = 'force-dynamic'

async function getHandler(request: NextRequest) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const userId = authResult.session.user.id
  const row = await db.query.userOnboardingAnswers.findFirst({
    where: eq(userOnboardingAnswers.userId, userId),
  })

  return NextResponse.json({ data: row?.answers ?? {} })
}

async function putHandler(request: NextRequest) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json()
  const parseResult = upsertOnboardingAnswersSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 },
    )
  }

  const userId = authResult.session.user.id

  await db
    .insert(userOnboardingAnswers)
    .values({ userId, answers: parseResult.data.answers })
    .onConflictDoUpdate({
      target: userOnboardingAnswers.userId,
      set: { answers: parseResult.data.answers },
    })

  return NextResponse.json({ data: parseResult.data.answers })
}

export const GET = withRequestLogging(getHandler, {
  actionName: 'GetOnboardingAnswers',
})

export const PUT = withRequestLogging(putHandler, {
  actionName: 'UpsertOnboardingAnswers',
})
