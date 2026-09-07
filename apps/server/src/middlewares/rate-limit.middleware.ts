import { env } from "@brnit/env/server";
import type { Request } from "express";
import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";

import {
	RATE_LIMIT_AUTH_MAX,
	RATE_LIMIT_AUTH_WINDOW_MINUTES,
	RATE_LIMIT_ERROR_CODE,
} from "../config/rate-limit.constants.js";

const MS_PER_MINUTE = 60 * 1000;

/** Limits apply only in production, so local dev and tests stay unthrottled. */
function isProductionRateLimitingEnabled(): boolean {
	return env.NODE_ENV === "production";
}

function windowMs(minutes: number): number {
	return minutes * MS_PER_MINUTE;
}

function buildRateLimitBody(humanMessage: string): {
	code: string;
	error: string;
} {
	return { code: RATE_LIMIT_ERROR_CODE, error: humanMessage };
}

/** Express-derived client IP, IPv6-normalized so a /64 cannot dodge the limit. */
function clientIp(req: Request): string {
	const ip = req.ip ?? req.socket.remoteAddress;
	return ip ? ipKeyGenerator(ip) : "unknown";
}

/**
 * Factory for production-only Express rate limiters. Feature routes build their
 * own limiters from this so the 429 envelope stays identical everywhere.
 */
export function createProductionRateLimiter(options: {
	keyGenerator?: Options["keyGenerator"];
	max: number;
	message: string;
	windowMinutes: number;
}) {
	return rateLimit({
		windowMs: windowMs(options.windowMinutes),
		max: options.max,
		standardHeaders: true,
		legacyHeaders: false,
		skip: () => !isProductionRateLimitingEnabled(),
		message: buildRateLimitBody(options.message),
		keyGenerator: options.keyGenerator ?? clientIp,
	});
}

/** Strict per-IP limit on sign-in, sign-up and password-reset endpoints. */
export const authCredentialRateLimiter = createProductionRateLimiter({
	max: RATE_LIMIT_AUTH_MAX,
	windowMinutes: RATE_LIMIT_AUTH_WINDOW_MINUTES,
	message: "Too many authentication attempts, please try again later.",
});
