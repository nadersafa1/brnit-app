import type { NextRequest } from 'next/server'
import { auth } from '@brnit/auth'
import { db } from '@brnit/db'
import { auditLog } from '@brnit/db/schema'

import { logger } from '@/lib/server-logger'

export type AuditLogWriteInput = {
  requestId: string
  actionName: string
  resource: string | null
  endpoint: string
  requestMethod: string
  statusCode: number
  success: boolean
  durationMs: number
}

export function extractClientIp(req: NextRequest): string | null {
  // Prefer first IP in X-Forwarded-For (might include multiple if behind proxies).
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const xRealIp = req.headers.get('x-real-ip')?.trim()
  return xRealIp || null
}

function titleCase(input: string): string {
  return input
    .replaceAll(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
}

export function deriveResource(endpointPathname: string): string | null {
  // endpointPathname example: /api/member/me/food-items/[id]/alternatives
  // We store resource as the first segment after `/api/` (after stripping optional version).
  const parts = endpointPathname.split('/').filter(Boolean)
  if (parts.length < 2) return null

  const afterApi = parts[0] === 'api' ? parts[1] : parts[0]
  return afterApi ? titleCase(afterApi) : null
}

export function deriveActionName(method: string, endpointPathname: string): string {
  const verb = (() => {
    switch (method) {
      case 'GET':
        return 'Get'
      case 'POST':
        return 'Create'
      case 'PUT':
      case 'PATCH':
        return 'Update'
      case 'DELETE':
        return 'Delete'
      default:
        return method
    }
  })()

  // Derive a stable label using the "resource" segment after `/api/`.
  // This avoids leaking dynamic IDs into actionName while keeping it human-readable.
  const resource = deriveResource(endpointPathname) ?? 'Request'

  return `${verb}${resource}`
}

export function deriveOrganizationIdFromRequest(req: NextRequest): string | null {
  try {
    const url = new URL(req.url)
    const orgId = url.searchParams.get('orgId')
    const cleaned = orgId?.trim() ?? ''
    return cleaned || null
  } catch {
    return null
  }
}

export async function writeAuditLog(
  req: NextRequest,
  input: AuditLogWriteInput
): Promise<void> {
  const durationMs = Math.max(0, Math.floor(input.durationMs))

  try {
    const organizationId = deriveOrganizationIdFromRequest(req)

    const session = await auth.api.getSession({ headers: req.headers })

    const userId = session?.user?.id ?? null
    const userRole = session?.user?.role ?? null

    const ip = extractClientIp(req)
    const userAgent = req.headers.get('user-agent')?.trim() || null

    // Best-effort message: keep it intentionally non-sensitive and short.
    const message = input.success ? null : `Request failed (${input.statusCode})`

    await db.insert(auditLog).values({
      actionName: input.actionName,
      resource: input.resource,
      endpoint: input.endpoint,
      requestId: input.requestId,

      requestMethod: input.requestMethod,
      statusCode: input.statusCode,
      success: input.success,
      durationMs,

      userId,
      userRole,
      organizationId,

      ip,
      userAgent,
      message,
    })
  } catch (err) {
    // Phase 2 must never break business logic.
    logger.error('Failed to write audit log', { err })
  }
}

