import { getLogger } from "@brnit/logger";

import { getFirebaseMessaging } from "./firebase-admin";

/**
 * FCM error codes that mean "this token is dead, stop storing it".
 *
 * Every other failure (quota, unavailable, internal) is transient and must not
 * cost the user their registration — a device that is merely unreachable today
 * still needs its token tomorrow.
 */
const STALE_TOKEN_ERROR_CODES = new Set([
	"messaging/registration-token-not-registered",
	"messaging/invalid-registration-token",
]);

export interface SendPushToTokensArgs {
	readonly body: string;
	readonly channelId?: string;
	readonly data?: Readonly<Record<string, string>>;
	readonly title: string;
	readonly tokens: readonly string[];
}

export interface SendPushToTokensResult {
	readonly failed: number;
	readonly sent: number;
	/** Tokens the caller should delete; see {@link STALE_TOKEN_ERROR_CODES}. */
	readonly staleTokens: readonly string[];
}

function logUnconfigured(tokenCount: number): void {
	const log = getLogger().child({ component: "push" });
	if (process.env.NODE_ENV === "production") {
		log.error({ tokenCount }, "firebase is not configured; push was not sent");
		return;
	}
	log.warn({ tokenCount }, "firebase is not configured; skipping push send");
}

/**
 * Sends one multicast push through FCM.
 *
 * No-ops when Firebase is unconfigured, and never throws for a per-token
 * failure: `sendEachForMulticast` reports each token independently, so a single
 * uninstalled device cannot fail the whole batch. Callers get counts plus the
 * tokens worth pruning and decide for themselves whether to retry.
 */
export async function sendPushToTokens(
	args: SendPushToTokensArgs
): Promise<SendPushToTokensResult> {
	const uniqueTokens = [
		...new Set(args.tokens.filter((token) => token.length > 0)),
	];
	if (uniqueTokens.length === 0) {
		return { sent: 0, failed: 0, staleTokens: [] };
	}

	const messaging = getFirebaseMessaging();
	if (!messaging) {
		logUnconfigured(uniqueTokens.length);
		return { sent: 0, failed: uniqueTokens.length, staleTokens: [] };
	}

	const response = await messaging.sendEachForMulticast({
		tokens: uniqueTokens,
		notification: {
			title: args.title,
			body: args.body,
		},
		data: args.data,
		android: args.channelId
			? {
					notification: {
						channelId: args.channelId,
					},
				}
			: undefined,
		apns: {
			payload: {
				aps: {
					sound: "default",
				},
			},
		},
	});

	const staleTokens: string[] = [];
	let sent = 0;
	let failed = 0;

	for (const [index, result] of response.responses.entries()) {
		if (result.success) {
			sent += 1;
			continue;
		}
		failed += 1;
		const code = result.error?.code;
		if (code && STALE_TOKEN_ERROR_CODES.has(code)) {
			const staleToken = uniqueTokens[index];
			if (staleToken) {
				staleTokens.push(staleToken);
			}
		}
	}

	return { sent, failed, staleTokens };
}
