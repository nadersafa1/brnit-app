import { db } from '@burn-app/db'
import { userPreferences } from '@burn-app/db/schema'
import {
  CURRENT_PREFS_SCHEMA_VERSION,
  computePreferenceCompletion,
  effectivePreferences,
  mergePreferenceRecords,
  patchUserPreferencesBodySchema,
} from '@burn-app/user-preferences'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api-helpers/require-auth'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'
import { logger } from '@/lib/server-logger'

export const dynamic = 'force-dynamic'

type PreferencesResponse = {
  preferences: ReturnType<typeof effectivePreferences>
  schemaVersion: number
  appSchemaVersion: typeof CURRENT_PREFS_SCHEMA_VERSION
  completion: ReturnType<typeof computePreferenceCompletion>
  /** True when required keys are missing or the row predates the app’s current prefs schema. */
  needsCatchUp: boolean
}

function buildResponse(
  raw: Record<string, unknown>,
  rowSchemaVersion: number
): PreferencesResponse {
  const completion = computePreferenceCompletion(raw)
  const needsCatchUp =
    completion.needsAttention || rowSchemaVersion < CURRENT_PREFS_SCHEMA_VERSION
  return {
    preferences: effectivePreferences(raw),
    schemaVersion: rowSchemaVersion,
    appSchemaVersion: CURRENT_PREFS_SCHEMA_VERSION,
    completion,
    needsCatchUp,
  }
}

async function getHandler(request: NextRequest) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const userId = authResult.session.user.id

  try {
    const row = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    })

    const raw = (row?.preferences as Record<string, unknown>) ?? {}
    return NextResponse.json(buildResponse(raw, row?.schemaVersion ?? 0))
  } catch (error) {
    logger.error('Get user preferences failed', { err: error })
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 })
  }
}

/** Persists merged jsonb: `lengthUnit`, optional `heightCm`, `questionnaire` (onboarding answers). */
async function patchHandler(request: NextRequest) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const userId = authResult.session.user.id

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = patchUserPreferencesBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { preferences: patch } = parsed.data

  try {
    const existing = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    })

    const prevRaw = (existing?.preferences as Record<string, unknown>) ?? {}
    const merged = mergePreferenceRecords(prevRaw, patch as Record<string, unknown>)
    const completion = computePreferenceCompletion(merged)
    const nextSchemaVersion = completion.needsAttention
      ? (existing?.schemaVersion ?? 0)
      : CURRENT_PREFS_SCHEMA_VERSION

    await db
      .insert(userPreferences)
      .values({
        userId,
        preferences: merged,
        schemaVersion: nextSchemaVersion,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          preferences: merged,
          schemaVersion: nextSchemaVersion,
          updatedAt: new Date(),
        },
      })

    return NextResponse.json(buildResponse(merged, nextSchemaVersion))
  } catch (error) {
    logger.error('Patch user preferences failed', { err: error })
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler, { actionName: 'GetUserPreferences' })
export const PATCH = withRequestLogging(patchHandler, { actionName: 'PatchUserPreferences' })
