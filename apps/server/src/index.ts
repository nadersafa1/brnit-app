import "dotenv/config";
// Instrumentation must run before any module under observation is imported.
import "./instrumentation.js";

// Every date in brnit is a UTC calendar date (plan days, consumption dates,
// streaks). Pinning the process TZ keeps a mis-set container clock from
// shifting them.
process.env.TZ ??= "UTC";

import { env } from "@brnit/env/server";
import { logger } from "@brnit/logger";

import { AppServer } from "./app-server.js";
import { closeHealthRedisClient } from "./lib/health/checks.js";
import { setSocketIoForHealth } from "./lib/health/socket-io-ref.js";
import { registerProcessHandlers } from "./lib/process-handlers.js";
import { createSocketServer } from "./sockets/socket-server.js";

const server = new AppServer();
const httpServer = server.listen(env.PORT);
const socketBundle = await createSocketServer(httpServer);

// Setter injection: modules that need the live Socket.IO instance read it from
// a module-level ref instead of importing the entrypoint (which would cycle).
setSocketIoForHealth(socketBundle.io);

httpServer.on("listening", () => {
	logger.info({ port: env.PORT }, "server listening");
});

registerProcessHandlers(httpServer, socketBundle.io, async () => {
	await socketBundle.closeRedisAdapter();
	await closeHealthRedisClient();
});

export default server.app;
