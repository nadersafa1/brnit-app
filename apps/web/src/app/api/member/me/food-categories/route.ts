import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { db } from '@burn-app/db'
import { foodCategory } from '@burn-app/db/schema'
import { asc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/** List all food categories for the authenticated member. */
export const GET = async (request: NextRequest) => {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const categories = await db
    .select({ id: foodCategory.id, name: foodCategory.name })
    .from(foodCategory)
    .orderBy(asc(foodCategory.name))

  return NextResponse.json({ data: categories })
}
