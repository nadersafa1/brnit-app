/**
 * Console-only server logger (Phase 1).
 * - Supports log levels
 * - Redacts sensitive meta keys (authorization/cookie/token/password/etc.)
 * - Keeps output human-readable for local debugging
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type Primitive = string | number | boolean | null
type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue }

// Logger meta can include complex runtime values (including `Error`);
// we always redact/serialize them safely before output.
export type LogMeta = Record<string, unknown>

const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info'
const LOG_COLOR = (process.env.LOG_COLOR ?? 'true') !== 'false'
const LOG_STACKS = (process.env.LOG_STACKS ?? (process.env.NODE_ENV === 'production' ? 'false' : 'true')) !== 'false'

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const sensitiveKeyPattern = /^(authorization|cookie|set-cookie|token|password|apikey|api_key|secret)$/i

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function redactError(err: Error): Record<string, JsonValue> {
  const base: Record<string, JsonValue> = {
    name: err.name,
    message: err.message,
  }
  if (LOG_STACKS && err.stack) base.stack = err.stack
  return base
}

function redactPlainObject(obj: Record<string, unknown>, depth: number): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {}

  for (const [k, v] of Object.entries(obj)) {
    if (sensitiveKeyPattern.test(k)) {
      out[k] = '[REDACTED]'
      continue
    }

    const rv = redactValue(v, depth + 1)
    if (rv !== undefined) out[k] = rv
  }

  return out
}

function redactArray(arr: unknown[], depth: number): JsonValue[] {
  return arr.map((v) => redactValue(v, depth + 1) ?? null)
}

function redactValue(value: unknown, depth = 0): JsonValue | undefined {
  // Prevent runaway recursion on cyclic objects.
  if (depth > 6) return '[Truncated]'

  if (value == null) return null

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value

  if (value instanceof Error) return redactError(value)

  if (Array.isArray(value)) return redactArray(value, depth)

  if (isPlainObject(value)) return redactPlainObject(value, depth)

  // Non-plain objects (Date, Buffer, class instances, etc.) can leak via toString().
  // We intentionally collapse them to a stable label.
  if (typeof value === 'object') {
    const ctorName = (value as { constructor?: { name?: string } }).constructor?.name
    return ctorName ? `[${ctorName}]` : '[Object]'
  }

  if (typeof value === 'function') return '[Function]'

  // At this point we expect primitives; avoid `[object Object]` surprises.
  if (typeof value === 'object') return '[Object]'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString()
  }
  if (typeof value === 'symbol') return value.toString()
  return '[Unserializable]'
}

function color(text: string, ansi: string): string {
  if (!LOG_COLOR) return text
  return `\u001b[${ansi}m${text}\u001b[0m`
}

function colorForLevel(level: LogLevel): (s: string) => string {
  switch (level) {
    case 'debug':
      return (s) => color(s, '90') // gray
    case 'info':
      return (s) => color(s, '32') // green
    case 'warn':
      return (s) => color(s, '33') // yellow
    case 'error':
      return (s) => color(s, '31') // red
  }
}

function stringifyMeta(meta: LogMeta | undefined): string {
  if (!meta) return ''

  const redacted = redactValue(meta)

  if (!redacted || (isPlainObject(redacted) && Object.keys(redacted).length === 0)) return ''

  try {
    return ` ${JSON.stringify(redacted)}`
  } catch {
    return ' {"meta":"[Unserializable]"}'
  }
}

export type Logger = {
  child: (bindings: LogMeta) => Logger
  debug: (message: string, meta?: LogMeta) => void
  info: (message: string, meta?: LogMeta) => void
  warn: (message: string, meta?: LogMeta) => void
  error: (message: string, meta?: LogMeta) => void
}

function createLogger(bindings?: LogMeta): Logger {
  const baseBindings = bindings ?? {}

  function log(level: LogLevel, message: string, meta?: LogMeta) {
    if (levelOrder[level] < levelOrder[LOG_LEVEL]) return
    const ts = new Date().toISOString()
    const lvl = colorForLevel(level)(level.toUpperCase())
    const mergedMeta = { ...baseBindings, ...meta }
    const line = `${ts} | ${lvl} | ${message}${stringifyMeta(mergedMeta)}`

    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  }

  return {
    child(nextBindings) {
      return createLogger({ ...baseBindings, ...nextBindings })
    },
    debug(message, meta) {
      log('debug', message, meta)
    },
    info(message, meta) {
      log('info', message, meta)
    },
    warn(message, meta) {
      log('warn', message, meta)
    },
    error(message, meta) {
      log('error', message, meta)
    },
  }
}

export const logger = createLogger()

