import type { SessionRecord, SessionUser } from "@brnit/api";
import type { Logger } from "pino";
import type { DefaultEventsMap, Server, Socket } from "socket.io";

/**
 * The typed shapes every socket module uses.
 *
 * socket.io exposes `SocketData` as the **fourth generic parameter** of
 * `Server`/`Socket`, defaulting to `any` — it is not a module-level interface,
 * so a `declare module "socket.io"` augmentation compiles but leaves
 * `socket.data` untyped. Threading the generic explicitly is what actually
 * makes `socket.data.user` checked.
 *
 * Every field is non-optional: `socketLogger` and `socketAuth` both run as
 * connection middleware, and `socketAuth` refuses the handshake when there is
 * no session — so by the time any handler sees a socket, all four exist.
 */
export interface AppSocketData {
	log: Logger;
	requestId: string;
	session: SessionRecord;
	user: SessionUser;
}

/**
 * Event maps stay `DefaultEventsMap` (a permissive index signature) on purpose:
 * payload validation is done at runtime by the zod schemas in
 * `@brnit/realtime`, which is the only check that survives a client on a
 * different deploy.
 */
export type AppServer = Server<
	DefaultEventsMap,
	DefaultEventsMap,
	DefaultEventsMap,
	AppSocketData
>;

export type AppSocket = Socket<
	DefaultEventsMap,
	DefaultEventsMap,
	DefaultEventsMap,
	AppSocketData
>;
