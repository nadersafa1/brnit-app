import type { Express } from "express";

/**
 * Stand-in for `HttpError` in tests that mock `@brnit/api`. Structurally
 * identical, so `handleHandlerError`'s `instanceof` branch behaves the same.
 */
export class MockHttpError extends Error {
	readonly status: number;
	readonly causeDetail: unknown;

	constructor(status: number, message: string, causeDetail?: unknown) {
		super(message);
		this.name = "HttpError";
		this.status = status;
		this.causeDetail = causeDetail;
	}
}

/**
 * Boots the app on an ephemeral port so tests can drive it with real `fetch` —
 * no supertest, and the full middleware chain runs exactly as in production.
 */
export async function startEphemeralServer(
	app: Express
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
	const server = app.listen(0);
	await new Promise<void>((resolve) => server.once("listening", resolve));
	const address = server.address();
	if (!address || typeof address === "string") {
		throw new Error("Could not resolve ephemeral server port");
	}

	return {
		baseUrl: `http://127.0.0.1:${address.port}`,
		close: async () => {
			await new Promise<void>((resolve, reject) => {
				server.close((error) => {
					if (error) {
						reject(error);
						return;
					}
					resolve();
				});
			});
		},
	};
}
