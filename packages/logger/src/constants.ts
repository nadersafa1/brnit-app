/** Incoming / outgoing request correlation header (lowercase for Node header lookup). */
export const REQUEST_ID_HEADER = "x-request-id";

/** Echoed on every HTTP response so clients can correlate support tickets with logs. */
export const REQUEST_ID_RESPONSE_HEADER = "X-Request-Id";

/**
 * Paths redacted from all log output (access logs and manual `logger` calls).
 *
 * Ports the key set the pre-overhaul `server-logger` matched by regex
 * (`authorization|cookie|set-cookie|token|password|apikey|api_key|secret`).
 * Pino redaction is path-based rather than regex-based and its `*` wildcard
 * spans exactly one level, so each key is listed at the top level, one level
 * deep, and at the concrete `req`/`res` header paths that matter most.
 */
export const REDACT_PATHS = [
	"req.headers.authorization",
	"req.headers.cookie",
	'req.headers["set-cookie"]',
	'res.headers["set-cookie"]',
	"req.body.password",
	"req.body.currentPassword",
	"req.body.newPassword",
	"req.body.token",
	"req.body.refreshToken",
	"req.body.secret",
	"authorization",
	"cookie",
	"set-cookie",
	"token",
	"password",
	"apikey",
	"api_key",
	"secret",
	"*.authorization",
	"*.cookie",
	"*.token",
	"*.password",
	"*.apikey",
	"*.api_key",
	"*.secret",
] as const;

const PINO_LEVELS = [
	"trace",
	"debug",
	"info",
	"warn",
	"error",
	"fatal",
	"silent",
] as const;

export type PinoLogLevel = (typeof PINO_LEVELS)[number];

export function isPinoLogLevel(value: string): value is PinoLogLevel {
	return (PINO_LEVELS as readonly string[]).includes(value);
}
