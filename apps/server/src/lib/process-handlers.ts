import type { Server as HttpServer } from "node:http";
import { logger } from "@brnit/logger";
import type { Server as SocketIoServer } from "socket.io";

/** Hard deadline: if graceful shutdown stalls, exit anyway. */
const SHUTDOWN_TIMEOUT_MS = 10_000;

let isShuttingDown = false;

function stringifyReason(reason: unknown): string {
	switch (typeof reason) {
		case "string":
			return reason;
		case "number":
		case "boolean":
		case "bigint":
		case "symbol":
			return String(reason);
		case "undefined":
			return "undefined";
		case "function":
			return `function ${reason.name || "anonymous"}`;
		case "object": {
			if (reason === null) {
				return "null";
			}
			try {
				return JSON.stringify(reason);
			} catch {
				return "unserializable rejection reason";
			}
		}
		default:
			return "unknown rejection reason";
	}
}

function toError(reason: unknown): Error {
	return reason instanceof Error ? reason : new Error(stringifyReason(reason));
}

function finishShutdown(exitCode: number, closeErr?: Error | null): void {
	if (closeErr) {
		logger.error({ err: closeErr }, "error while closing HTTP server");
	}

	logger.flush(() => {
		process.exit(exitCode);
	});
}

/**
 * Closes Socket.IO, then Redis, then stops accepting connections, then flushes
 * log buffers and exits. Idempotent: further signals while shutting down are
 * ignored.
 */
async function shutdown(
	server: HttpServer,
	io: SocketIoServer | undefined,
	closeRedis: (() => Promise<void>) | undefined,
	signal: string,
	err?: Error
): Promise<void> {
	if (isShuttingDown) {
		return;
	}
	isShuttingDown = true;

	if (err) {
		const message =
			signal === "unhandledRejection"
				? "unhandled rejection"
				: "uncaught exception";
		logger.fatal({ err, signal }, message);
	} else {
		logger.info({ signal }, "shutting down");
	}

	const forceExitTimer = setTimeout(() => {
		logger.error("forced exit after shutdown timeout");
		process.exit(1);
	}, SHUTDOWN_TIMEOUT_MS);
	forceExitTimer.unref();

	try {
		if (io) {
			await io.close();
		}
		if (closeRedis) {
			await closeRedis();
		}
	} catch (closeErr) {
		logger.error({ err: closeErr }, "error while closing socket.io / redis");
	}

	server.close((closeErr) => {
		finishShutdown(err || closeErr ? 1 : 0, closeErr);
	});
}

/**
 * Registers process-level handlers for fatal errors and graceful termination.
 * Call once, from the entrypoint, after the HTTP server and Socket.IO exist.
 */
export function registerProcessHandlers(
	server: HttpServer,
	io?: SocketIoServer,
	closeRedis?: () => Promise<void>
): void {
	const run = (signal: string, err?: Error): void => {
		shutdown(server, io, closeRedis, signal, err).catch(
			(shutdownErr: unknown) => {
				logger.error({ err: shutdownErr, signal }, "shutdown failed");
				process.exit(1);
			}
		);
	};

	process.on("uncaughtException", (err) => {
		run("uncaughtException", err);
	});

	process.on("unhandledRejection", (reason) => {
		run("unhandledRejection", toError(reason));
	});

	process.on("SIGTERM", () => {
		run("SIGTERM");
	});

	process.on("SIGINT", () => {
		run("SIGINT");
	});
}
