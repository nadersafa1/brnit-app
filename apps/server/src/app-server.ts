import type { Server } from "node:http";
import { env } from "@brnit/env/server";
import express, { type Express } from "express";

import { setupApp } from "./startup/setup-app.js";

export class AppServer {
	readonly app: Express;

	constructor() {
		this.app = express();
		// Behind Dokploy's proxy in production: trust exactly one hop so `req.ip`
		// (and therefore the rate limiters) sees the real client address.
		if (env.NODE_ENV === "production") {
			this.app.set("trust proxy", 1);
		}
		setupApp(this.app);
	}

	listen(port = env.PORT): Server {
		return this.app.listen(port);
	}
}
