import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import {
	logger,
	REQUEST_ID_HEADER,
	REQUEST_ID_RESPONSE_HEADER,
	requestContext,
} from "@brnit/logger";
import type { NextFunction, Request, Response } from "express";
import pinoHttp, { type ReqId } from "pino-http";

import {
	requestPathname,
	resolveAccessLogLevel,
} from "./http-logger.access-level.js";

const requestStartMsKey = Symbol.for("brnit.httpRequestStartMs");

/** Reuses the caller's `X-Request-Id` when supplied so traces span the client hop. */
function readRequestIdHeader(
	headers: IncomingMessage["headers"]
): string | undefined {
	const value = headers[REQUEST_ID_HEADER];
	const candidate = Array.isArray(value) ? value[0] : value;
	return candidate && candidate.length > 0 ? candidate : undefined;
}

/** Normalizes pino-http's `ReqId` (string | number | object) to a log-safe string. */
function stringifyRequestId(id: ReqId): string {
	if (typeof id === "string") {
		return id;
	}
	if (typeof id === "number") {
		return id.toString();
	}
	if (id === null) {
		return randomUUID();
	}
	if (Buffer.isBuffer(id)) {
		return id.toString("hex");
	}
	try {
		return JSON.stringify(id);
	} catch {
		return randomUUID();
	}
}

function accessLogPath(req: IncomingMessage): string {
	const expressReq = req as Request;
	return requestPathname(expressReq.originalUrl ?? req.url);
}

function requestResponseTimeMs(req: IncomingMessage): number | undefined {
	const startMs = (req as unknown as Record<symbol, number>)[requestStartMsKey];
	return startMs === undefined ? undefined : Date.now() - startMs;
}

/**
 * pino-http access logger: assigns `req.id` and `req.log`, echoes the request
 * id response header, and emits one structured line per response. Registered
 * first in `startup/setup-app.ts` so every later middleware can log.
 */
export const pinoHttpLogger = pinoHttp({
	logger,
	genReqId(req, res) {
		const id = readRequestIdHeader(req.headers) ?? randomUUID();
		res.setHeader(REQUEST_ID_RESPONSE_HEADER, id);
		(req as unknown as Record<symbol, number>)[requestStartMsKey] = Date.now();
		return id;
	},
	serializers: {
		req(req) {
			return {
				id: req.id,
				method: req.method,
				url: accessLogPath(req),
				remoteAddress: req.remoteAddress,
			};
		},
		res(res) {
			return { statusCode: res.statusCode };
		},
	},
	customProps(req, res) {
		const expressReq = req as Request;
		const routePath = expressReq.route?.path;
		const httpRoute =
			typeof routePath === "string" && routePath.length > 0
				? `${expressReq.baseUrl ?? ""}${routePath}`
				: undefined;

		return {
			logType: "access",
			clientIp: expressReq.ip ?? req.socket?.remoteAddress,
			http: {
				method: req.method,
				...(httpRoute ? { route: httpRoute } : {}),
				statusCode: res.statusCode,
			},
		};
	},
	customLogLevel(req, res, err) {
		const expressReq = req as Request;
		const statusCode = err ? (res.statusCode ?? 500) : res.statusCode;
		return resolveAccessLogLevel(
			req.method ?? "GET",
			expressReq.originalUrl ?? req.url,
			statusCode,
			requestResponseTimeMs(req)
		);
	},
	customSuccessMessage(req, res, responseTime) {
		return `${req.method} ${accessLogPath(req)} ${res.statusCode} ${responseTime}ms`;
	},
	autoLogging: {
		// The root liveness probe is high-volume and zero-signal in orchestrators.
		ignore: (req) => req.url === "/",
	},
});

/**
 * Binds `req.log` / `req.id` into AsyncLocalStorage so `getLogger()` resolves
 * the request-scoped child logger anywhere down the call stack — including
 * inside `@brnit/api` handlers, which never receive a logger argument.
 */
export function requestContextMiddleware(
	req: Request,
	_res: Response,
	next: NextFunction
): void {
	if (!req.log) {
		next(
			new Error("requestContextMiddleware requires pinoHttpLogger to run first")
		);
		return;
	}

	requestContext.run(
		{ requestId: stringifyRequestId(req.id), log: req.log },
		next
	);
}
