import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { db } from '@brnit/db'
import { foodCategory } from '@brnit/db/schema'
import { asc } from 'drizzle-orm'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

export const dynamic = 'force-dynamic'

/** List all food categories for the authenticated member. */
const getHandler = async (request: NextRequest) => {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const categories = await db
    .select({
      id: foodCategory.id,
      name: foodCategory.name,
      description: foodCategory.description,
    })
    .from(foodCategory)
    .orderBy(asc(foodCategory.name))

  return NextResponse.json({ data: categories })
}

export const GET = withRequestLogging(getHandler)
