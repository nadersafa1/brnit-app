import type { Writable } from "node:stream";
import { context, trace } from "@opentelemetry/api";
import { type AnyValue, logs, SeverityNumber } from "@opentelemetry/api-logs";
import { env } from "@brnit/env/server";
import pino, {
	type Level,
	type LevelWithSilent,
	type LoggerOptions,
	multistream,
	type StreamEntry,
} from "pino";

import { isPinoLogLevel, REDACT_PATHS } from "./constants";

const isDevelopment = env.NODE_ENV === "development";

/**
 * Resolves the active log level: an explicit, recognized `LOG_LEVEL` wins,
 * otherwise `debug` in development and `info` in production/test. An
 * unrecognized value warns and falls back rather than throwing — a typo in a
 * log setting must never stop the process from booting.
 */
function resolveLogLevel(): LevelWithSilent {
	const fromEnv = env.LOG_LEVEL;
	if (fromEnv === undefined) {
		return isDevelopment ? "debug" : "info";
	}
	if (isPinoLogLevel(fromEnv)) {
		return fromEnv;
	}
	console.warn(
		`[logger] LOG_LEVEL="${fromEnv}" is not a pino level; falling back to the NODE_ENV default`
	);
	return isDevelopment ? "debug" : "info";
}

const logLevel = resolveLogLevel();

/**
 * Stream-entry level cannot be "silent"; fall back to "trace" so a
 * silenced top-level logger still drains streams when re-enabled.
 */
const streamLevel: Level = logLevel === "silent" ? "trace" : logLevel;

/**
 * Mixin that attaches the active OpenTelemetry trace context to every
 * log record. Runs in the main thread (where the OTel SDK lives), so
 * `trace.getSpan(context.active())` resolves to the request's span and
 * we can emit `trace_id`/`span_id`/`trace_flags` alongside the message.
 *
 * Both the stdout stream and the OTel emit stream see these fields, so
 * log↔trace navigation works without depending on
 * `@opentelemetry/instrumentation-pino` patching pino successfully
 * (which is unreliable under Bun's IITM).
 */
function otelTraceMixin(): Record<string, string> {
	const span = trace.getSpan(context.active());
	if (!span) {
		return {};
	}
	const ctx = span.spanContext();
	if (!(ctx.traceId && ctx.spanId)) {
		return {};
	}
	return {
		trace_id: ctx.traceId,
		span_id: ctx.spanId,
		trace_flags: `0${ctx.traceFlags.toString(16)}`.slice(-2),
	};
}

const baseOptions: LoggerOptions = {
	level: logLevel,
	mixin: otelTraceMixin,
	redact: {
		paths: [...REDACT_PATHS],
		censor: "[REDACTED]",
	},
	serializers: {
		err: pino.stdSerializers.err,
	},
};

/**
 * Read straight from `process.env`: the OTel SDK owns every `OTEL_*`
 * variable and reads them itself, so they are deliberately not declared
 * in `@brnit/env`.
 */
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();

/** Pino numeric levels mapped to OTel severity numbers. */
const PINO_LEVEL_TO_OTEL_SEVERITY: Record<number, SeverityNumber> = {
	10: SeverityNumber.TRACE, // pino: trace
	20: SeverityNumber.DEBUG, // pino: debug
	30: SeverityNumber.INFO, // pino: info
	40: SeverityNumber.WARN, // pino: warn
	50: SeverityNumber.ERROR, // pino: error
	60: SeverityNumber.FATAL, // pino: fatal
};

/**
 * Stream-shaped object that parses each pino JSON line and emits an
 * OTel log record into the global LoggerProvider initialized in
 * `apps/server/src/instrumentation.ts`. Stays entirely in the main
 * thread — no worker_threads, no extra transport packaging — which
 * sidesteps Bun + pino-transport-worker startup issues.
 *
 * Failures are intentionally swallowed: a broken telemetry path must
 * never break or stall the app, and the same record is still on its
 * way to stdout via the multistream peer.
 */
function createOtelLogStream(): Pick<Writable, "write"> {
	const otelLogger = logs.getLogger("@brnit/logger");
	return {
		write(chunk: string | Uint8Array): boolean {
			try {
				const line =
					typeof chunk === "string"
						? chunk
						: Buffer.from(chunk).toString("utf8");
				const record = JSON.parse(line) as Record<string, unknown> & {
					level?: number;
					time?: number;
					msg?: string;
					hostname?: string;
					pid?: number;
				};

				const severityNumber =
					(typeof record.level === "number" &&
						PINO_LEVEL_TO_OTEL_SEVERITY[record.level]) ||
					SeverityNumber.INFO;

				const severityText =
					typeof record.level === "number"
						? (pino.levels.labels[record.level] ?? "info")
						: "info";

				const {
					msg,
					time,
					level: _level,
					hostname: _hostname,
					pid: _pid,
					...attributes
				} = record;

				otelLogger.emit({
					body: typeof msg === "string" ? msg : line,
					severityNumber,
					severityText,
					timestamp: typeof time === "number" ? time : undefined,
					attributes: attributes as Record<string, AnyValue>,
				});
			} catch {
				// Swallow JSON parse / emit errors — log shipping is best-effort.
			}
			return true;
		},
	};
}

/**
 * Builds the active output streams. Production sends raw JSON to stdout
 * (Docker logs). Development pipes through pino-pretty for readable
 * local output. When OTEL_EXPORTER_OTLP_ENDPOINT is set, a second
 * stream forwards each record to the OTel LoggerProvider so the
 * collector receives them with trace correlation.
 */
function buildStreams(): StreamEntry[] {
	const stdoutEntry: StreamEntry = isDevelopment
		? {
				level: streamLevel,
				stream: pino.transport({
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "SYS:standard",
						ignore: "pid,hostname",
					},
				}),
			}
		: { level: streamLevel, stream: process.stdout };

	if (!otlpEndpoint) {
		return [stdoutEntry];
	}

	return [stdoutEntry, { level: streamLevel, stream: createOtelLogStream() }];
}

/**
 * Root application logger. `apps/server` entrypoints import this directly;
 * everything deeper calls `getLogger()` so request-scoped fields survive.
 * Call style is pino-native: `log.info({ field }, "lowercase message")`,
 * errors always `{ err }`.
 */
export const logger = pino(baseOptions, multistream(buildStreams()));
