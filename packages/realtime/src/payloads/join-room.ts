import { z } from "zod";

/** Body of `realtime:join` and `realtime:leave`. */
export const joinRoomPayloadSchema = z.object({
	room: z.string().min(1),
});

export type JoinRoomPayload = z.infer<typeof joinRoomPayloadSchema>;

/**
 * Body of `realtime:join-error`.
 *
 * `FORBIDDEN` and `INVALID_ROOM` are kept distinct on purpose: a client that
 * asked for a room shape the server does not recognise has a bug, while a
 * refused-but-valid room usually means the user lost the membership that
 * authorized it and the UI should stop retrying.
 */
export const joinRoomErrorPayloadSchema = z.object({
	code: z.enum(["INVALID_ROOM", "FORBIDDEN", "PARSE_ERROR"]),
	room: z.string().optional(),
});

export type JoinRoomErrorPayload = z.infer<typeof joinRoomErrorPayloadSchema>;
