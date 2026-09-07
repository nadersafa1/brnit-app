/**
 * OpenTelemetry bootstrap for the brnit server (api + workers).
 *
 * Must run before any module under observation (express, pg, redis, bullmq,
 * pino, ...) is imported, so the auto-instrumentations can patch them on first
 * load. Two delivery paths cover both runtime modes:
 *
 *   - Local dev (`bun run --hot src/index.ts`, no bundling): the entrypoints
 *     `import "./instrumentation.js"` as their first statement, which is enough
 *     because Bun resolves imports in source order with no chunk merging.
 *
 *   - Production (`dist/index.mjs` after tsdown):
 *       bun --preload ./dist/instrumentation.mjs ./dist/index.mjs
 *     guarantees the SDK starts before the entrypoint chunk loads, even when
 *     rolldown coalesces shared modules into one chunk. This is exactly what
 *     the `api` and `worker` services in docker-compose.yml run.
 *
 * Both paths are idempotent thanks to the global flag below: if the SDK is
 * already running (preload winning the race), the static import is a no-op.
 *
 * The whole bootstrap is a no-op unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
 * Endpoint and headers come from the standard OTLP env vars, which the
 * exporters read themselves — that is why they are deliberately absent from
 * `@brnit/env`:
 *   - OTEL_EXPORTER_OTLP_ENDPOINT      e.g. https://otel.example.com
 *   - OTEL_EXPORTER_OTLP_HEADERS       e.g. Authorization=Basic <base64>
 *   - OTEL_SERVICE_NAME                e.g. brnit-api
 *   - OTEL_RESOURCE_ATTRIBUTES         e.g. deployment.environment.name=staging
 */

const OTEL_INIT_FLAG = "__brnitOtelInitialized";
type GlobalWithFlag = typeof globalThis & { [OTEL_INIT_FLAG]?: boolean };
const globalWithFlag = globalThis as GlobalWithFlag;
const alreadyInitialized = globalWithFlag[OTEL_INIT_FLAG] === true;
if (!alreadyInitialized) {
	globalWithFlag[OTEL_INIT_FLAG] = true;
}

import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
	BatchLogRecordProcessor,
	LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();

function parseOtlpEndpointHost(endpoint: string): string | undefined {
	try {
		return new URL(endpoint).host;
	} catch {
		return;
	}
}

/**
 * Logs through `@brnit/logger` lazily. A static import would pull pino in
 * before the SDK starts, defeating the whole point of this module.
 */
function logOtelStartup(
	level: "info" | "debug",
	message: string,
	fields: Record<string, string | undefined>
): void {
	import("@brnit/logger")
		.then(({ logger }) => {
			logger[level](fields, message);
		})
		.catch((error: unknown) => {
			diag.error("Failed to emit OpenTelemetry startup log", error);
		});
}

if (otlpEndpoint && !alreadyInitialized) {
	if (process.env.OTEL_LOG_LEVEL?.toLowerCase() === "debug") {
		diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
	}

	const serviceName = process.env.OTEL_SERVICE_NAME ?? "brnit-server";
	const deploymentEnvironment =
		process.env.OTEL_DEPLOYMENT_ENVIRONMENT ??
		process.env.NODE_ENV ??
		"production";
	const serviceVersion =
		process.env.OTEL_SERVICE_VERSION ?? process.env.GIT_COMMIT_SHA ?? "0.0.0";

	const resource = resourceFromAttributes({
		[ATTR_SERVICE_NAME]: serviceName,
		[ATTR_SERVICE_VERSION]: serviceVersion,
		"service.namespace": "brnit",
		"deployment.environment.name": deploymentEnvironment,
	});

	// Logs go through their own provider: NodeSDK's log pipeline is still
	// experimental and we want explicit OTLP HTTP wiring.
	const loggerProvider = new LoggerProvider({
		resource,
		processors: [new BatchLogRecordProcessor(new OTLPLogExporter())],
	});
	logs.setGlobalLoggerProvider(loggerProvider);

	// Express auto-instrumentation can fail to patch under Bun's IITM
	// implementation (http still patches, so spans exist, but their names stay
	// bare HTTP verbs with no route). Reading `req.route` as the http span ends
	// makes span names route-aware regardless of whether the express
	// instrumentation hooked successfully — Express always sets `req.route` on a
	// match, so this fallback is independent of any patching.
	interface RouteAwareRequest {
		baseUrl?: string;
		method?: string;
		originalUrl?: string;
		route?: { path?: string };
	}

	const sdk = new NodeSDK({
		resource,
		traceExporter: new OTLPTraceExporter(),
		instrumentations: [
			getNodeAutoInstrumentations({
				// fs spans are extremely noisy and rarely useful.
				"@opentelemetry/instrumentation-fs": { enabled: false },
				// dns spans are low signal for service-level traces.
				"@opentelemetry/instrumentation-dns": { enabled: false },
				"@opentelemetry/instrumentation-http": {
					applyCustomAttributesOnSpan: (span, request) => {
						const req = request as RouteAwareRequest;
						const routePath = req.route?.path;
						if (typeof routePath === "string" && routePath.length > 0) {
							const fullRoute = `${req.baseUrl ?? ""}${routePath}`;
							const method = req.method ?? "HTTP";
							span.updateName(`${method} ${fullRoute}`);
							span.setAttribute("http.route", fullRoute);
						}
					},
				},
				// `@brnit/logger` bridges pino → OTel logs in-process via a
				// `pino.multistream` peer, which does not depend on IITM patching
				// (flaky for pino under Bun). Leaving this enabled would emit every
				// record twice.
				"@opentelemetry/instrumentation-pino": { enabled: false },
			}),
		],
	});

	sdk.start();

	logOtelStartup("info", "OpenTelemetry enabled", {
		serviceName,
		deploymentEnvironment,
		otlpEndpointHost: parseOtlpEndpointHost(otlpEndpoint),
	});

	const shutdownOtel = async (): Promise<void> => {
		try {
			await sdk.shutdown();
			await loggerProvider.shutdown();
		} catch (error) {
			diag.error("OpenTelemetry shutdown failed", error);
		}
	};

	// `once` and a separate listener from `registerProcessHandlers`: the SDK owns
	// its own flush, and must drain before the process exits.
	process.once("SIGTERM", () => {
		shutdownOtel().finally(() => process.exit(0));
	});
	process.once("SIGINT", () => {
		shutdownOtel().finally(() => process.exit(0));
	});
} else if (!alreadyInitialized) {
	logOtelStartup("debug", "OpenTelemetry disabled", {
		reason: "OTEL_EXPORTER_OTLP_ENDPOINT unset",
	});
}
