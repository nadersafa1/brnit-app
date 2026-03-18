import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/server-logger'

type RequestLogOptions = {
  actionName?: string
  skip?: (req: NextRequest) => boolean
}

// Next.js App Router route handlers can accept a second "context" argument, e.g.:
//   export const GET = async (req, { params }) => { ... }
// Your tests call handlers with that same signature, so we must preserve it.
type NextHandler = (req: NextRequest, context?: unknown) => Promise<Response> | Response

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

function getRequestId(req: NextRequest): string {
  const incoming = req.headers.get('x-request-id')?.trim()
  if (incoming) return incoming
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function safeErrorMeta(err: unknown): { err: unknown } {
  if (err instanceof Error) return { err }
  return { err: new Error(typeof err === 'string' ? err : 'Unknown error') }
}

export function withRequestLogging(handler: NextHandler, opts: RequestLogOptions = {}): NextHandler {
  return async (req: NextRequest, context?: unknown) => {
    // Correlation id: stable per request so multiple log lines can be traced.
    const requestId = getRequestId(req)
    const method = req.method
    const path = getRequestPath(req)

    // Optional bypass for environments where request logging is too noisy.
    if (!LOG_HTTP || (opts.skip?.(req) ?? false)) {
      const res = await handler(req, context)
      const out = toNextResponse(res)
      out.headers.set('x-request-id', requestId)
      return out
    }

    // Performance timing only in log-enabled mode.
    const start = performance.now()
    const actionName = opts.actionName
    const reqLogger = logger.child({ requestId, method, path, actionName })

    try {
      const res = await handler(req, context)
      const ms = performance.now() - start

      const statusStr = formatStatus(res.status)
      const ts = new Date().toISOString()
      reqLogger.info(`${ts} | ${method} ${path} | Status: ${statusStr} | Response Time: ${ms.toFixed(2)}ms`)

      // Ensure response header for correlation
      const out = toNextResponse(res)
      out.headers.set('x-request-id', requestId)
      return out
    } catch (err) {
      const ms = performance.now() - start
      const ts = new Date().toISOString()
      const statusStr = formatStatus(500)
      reqLogger.error(
        `${ts} | ${method} ${path} | Status: ${statusStr} | Response Time: ${ms.toFixed(2)}ms`,
        safeErrorMeta(err)
      )

      const out = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
      out.headers.set('x-request-id', requestId)
      return out
    }
  }
}

