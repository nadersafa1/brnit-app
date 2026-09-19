import { env } from '@burn-app/env/server'

const LEVEL_WEIGHT = { debug: 10, info: 20, warn: 30, error: 40 } as const

export type LogLevel = keyof typeof LEVEL_WEIGHT

/** Pino-shaped so this can be swapped for a real logger without touching call sites. */
export type LogFn = (fieldsOrMessage: Record<string, unknown> | string, message?: string) => void

export interface Logger {
  debug: LogFn
  info: LogFn
  warn: LogFn
  error: LogFn
  child(bindings: Record<string, unknown>): Logger
}

const threshold = LEVEL_WEIGHT[env.LOG_LEVEL] ?? LEVEL_WEIGHT.info

function serializeError(value: unknown): unknown {
  if (!(value instanceof Error)) return value
  return { message: value.message, name: value.name, stack: value.stack }
}

function emit(
  level: LogLevel,
  bindings: Record<string, unknown>,
  fieldsOrMessage: Record<string, unknown> | string,
  message?: string
): void {
  if (LEVEL_WEIGHT[level] < threshold) return

  const fields = typeof fieldsOrMessage === 'string' ? {} : { ...fieldsOrMessage }
  if ('err' in fields) fields.err = serializeError(fields.err)

  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    ...bindings,
    ...fields,
    msg: typeof fieldsOrMessage === 'string' ? fieldsOrMessage : message,
  })

  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout
  stream.write(`${line}\n`)
}

export function createLogger(bindings: Record<string, unknown> = {}): Logger {
  return {
    debug: (fields, message) => emit('debug', bindings, fields, message),
    info: (fields, message) => emit('info', bindings, fields, message),
    warn: (fields, message) => emit('warn', bindings, fields, message),
    error: (fields, message) => emit('error', bindings, fields, message),
    child: extra => createLogger({ ...bindings, ...extra }),
  }
}
