import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiErrorResponse } from '@/lib/api-helpers/api-error-response'
import { logger } from '@/lib/server-logger'
import { deriveActionName, deriveResource, writeAuditLog } from '@/lib/audit/audit-log-writer'

type RequestLogOptions = {
  actionName?: string
  skip?: (req: NextRequest) => boolean
}

// Next.js App Router route handlers can accept a second "context" argument, e.g.:
//   export const GET = async (req, { params }) => { ... }
// Your tests call handlers with that same signature, so we must preserve it.
// Use a generic context type so route handlers can strongly type `{ params }` etc.
// App Router always passes the second argument "context" at runtime.
type NextHandler<C = unknown> = (req: NextRequest, context: C) => Promise<Response> | Response

const LOG_HTTP =
  (process.env.LOG_HTTP ??
    (process.env.NODE_ENV === 'production' ? 'false' : 'true')) !== 'false'

const LOG_COLOR_ENABLED = (process.env.LOG_COLOR ?? 'true') !== 'false'

function applyAnsiColor(text: string, ansi: string): string {
  if (!LOG_COLOR_ENABLED) return text
  return `\u001b[${ansi}m${text}\u001b[0m`
}

function toNextResponse(res: Response): NextResponse {
  if (res instanceof NextResponse) return res
  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  })
}

function formatStatus(status: number): string {
  const s = String(status)
  if (status >= 500) return applyAnsiColor(s, '31')
  if (status >= 400) return applyAnsiColor(s, '33')
  if (status >= 300) return applyAnsiColor(s, '36')
  return applyAnsiColor(s, '32')
}

function getRequestPath(req: NextRequest): string {
  try {
    return req.nextUrl.pathname + (req.nextUrl.search || '')
  } catch {
    return req.url
  }
}

function getEndpointPath(req: NextRequest): string {
  try {
    // Endpoint path (no query params) for stable audit labels/correlation.
    return req.nextUrl.pathname
  } catch {
    return req.url.split('?')[0] || req.url
  }
}

function getRequestId(req: NextRequest): string {
  const incoming = req.headers.get('x-request-id')?.trim()
  if (incoming) return incoming
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function safeErrorMeta(err: unknown): { err: unknown } {
  if (err instanceof Error) return { err }
  return { err: new Error(typeof err === 'string' ? err : 'Unknown error') }
}

function isWriteMethod(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
}

export function withRequestLogging<C = unknown>(
  handler: NextHandler<C>,
  opts: RequestLogOptions = {}
): NextHandler<C> {
  return async (req: NextRequest, context: C) => {
    // Correlation id: stable per request so multiple log lines can be traced.
    const requestId = getRequestId(req)
    const method = req.method
    const path = getRequestPath(req)
    const endpointPath = getEndpointPath(req)

    const logHttpEnabled = LOG_HTTP && (opts.skip?.(req) ?? false) === false
    const auditEnabled = process.env.AUDIT_LOG_DB_ENABLED === 'true' && isWriteMethod(method)
    const shouldMeasure = logHttpEnabled || auditEnabled

    // Fast path: neither console logging nor audit logging is enabled.
    if (!shouldMeasure) {
      const res = await handler(req, context)
      const out = toNextResponse(res)
      out.headers.set('x-request-id', requestId)
      return out
    }

    // If either logging or audit is enabled, we use try/catch so Phase 2 can record failures.
    const start = performance.now()
    const actionName = opts.actionName
    const reqLogger = logHttpEnabled
      ? logger.child({ requestId, method, path, actionName })
      : null

    try {
      const res = await handler(req, context)
      const ms = performance.now() - start

      if (reqLogger) {
        const statusStr = formatStatus(res.status)
        const ts = new Date().toISOString()
        reqLogger.info(
          `${ts} | ${method} ${path} | Status: ${statusStr} | Response Time: ${ms.toFixed(2)}ms`
        )
      }

      const out = toNextResponse(res)
      out.headers.set('x-request-id', requestId)

      if (auditEnabled) {
        const durationMs = Math.round(ms)
        const actionNameForAudit = opts.actionName ?? deriveActionName(method, endpointPath)
        const resource = deriveResource(endpointPath)

        // Best-effort: audit logging must never break the response path.
        writeAuditLog(req, {
          requestId,
          actionName: actionNameForAudit,
          resource,
          endpoint: endpointPath,
          requestMethod: method,
          statusCode: res.status,
          success: res.status < 400,
          durationMs,
        })
      }

      return out
    } catch (err) {
      const ms = performance.now() - start

      if (reqLogger) {
        const ts = new Date().toISOString()
        const statusStr = formatStatus(500)
        reqLogger.error(
          `${ts} | ${method} ${path} | Status: ${statusStr} | Response Time: ${ms.toFixed(2)}ms`,
          safeErrorMeta(err)
        )
      }

      if (auditEnabled) {
        const durationMs = Math.round(ms)
        const actionNameForAudit = opts.actionName ?? deriveActionName(method, endpointPath)
        const resource = deriveResource(endpointPath)

        writeAuditLog(req, {
          requestId,
          actionName: actionNameForAudit,
          resource,
          endpoint: endpointPath,
          requestMethod: method,
          statusCode: 500,
          success: false,
          durationMs,
        })
      }

      const out = apiErrorResponse('Internal Server Error', 500)
      out.headers.set('x-request-id', requestId)
      return out
    }
  }
}

