import type { DbClient, DbTransaction } from "@brnit/db";
import { db } from "@brnit/db";
import { appVersionConfig } from "@brnit/db/schema";
import { isAppAdmin, isVersionBelow } from "@brnit/domain";
import { eq } from "drizzle-orm";

import type { Context, SessionUser } from "../context";
import { HttpError } from "../http-error";
import type {
	AdminVersionGateDto,
	AppVersionConfigDto,
	AppVersionResponse,
} from "./dto";
import type {
	AdminVersionGatePutBody,
	AppVersionConfigInput,
	AppVersionQuery,
} from "./schemas";

/**
 * The app version gate: one public read that resolves an action, and an
 * admin-only pair that reads and writes the thresholds behind it.
 *
 * **A missing row means the gate is off.** `getAppVersion` answers `none` for a
 * platform nobody has configured, which is the deliberate fail-open default —
 * an empty table, a fresh environment, or a botched deploy must not lock users
 * out of an app that works. Blocking is always an explicit admin decision.
 *
 * `getAppVersion` takes no context and asserts nothing: its route is public by
 * design, because a user whose build is about to be blocked cannot necessarily
 * sign in to be told so. It reads one row and leaks no threshold — see
 * `AppVersionResponse`.
 */

const UNAUTHORIZED_MESSAGE = "Unauthorized";

/** Reads may run on the request client or inside an open transaction. */
type VersionGateDbClient = DbClient | DbTransaction;

/**
 * Re-asserts the app `admin` role inside the handler, mirroring
 * `handlers/food.ts`: the route guard is defense in depth, not the only check,
 * so a handler mounted behind a different guard stays safe.
 *
 * Answers **401** rather than 403 for an authenticated non-admin, matching
 * `requireAdmin` — the pre-overhaul contract the clients branch on. Returns the
 * user because the write path stamps `updated_by` with their id.
 */
function assertAppAdmin(ctx: Context): SessionUser {
	const user = ctx.user;
	if (!user) {
		throw new HttpError(401, UNAUTHORIZED_MESSAGE);
	}
	if (!isAppAdmin(user.role)) {
		throw new HttpError(401, UNAUTHORIZED_MESSAGE);
	}
	return user;
}

/** Columns the admin DTO needs; `updated_at` / `updated_by` are audit-only. */
const CONFIG_DTO_COLUMNS = {
	latestVersion: appVersionConfig.latestVersion,
	message: appVersionConfig.message,
	minVersion: appVersionConfig.minVersion,
	storeUrl: appVersionConfig.storeUrl,
} as const;

function toDto(row: AppVersionConfigDto): AppVersionConfigDto {
	return {
		latestVersion: row.latestVersion,
		message: row.message,
		minVersion: row.minVersion,
		storeUrl: row.storeUrl,
	};
}

/**
 * Resolves the action for one reported build.
 *
 * Ordered, first match wins: `block` outranks `nudge`, so a build below both
 * thresholds is stopped rather than merely prompted.
 */
export async function getAppVersion(
	query: AppVersionQuery
): Promise<AppVersionResponse> {
	const rows = await db
		.select(CONFIG_DTO_COLUMNS)
		.from(appVersionConfig)
		.where(eq(appVersionConfig.platform, query.platform))
		.limit(1);

	const row = rows[0];
	if (!row) {
		return { action: "none", latestVersion: "", message: "", storeUrl: "" };
	}

	if (isVersionBelow(query.version, row.minVersion)) {
		return {
			action: "block",
			latestVersion: row.latestVersion,
			message: row.message,
			storeUrl: row.storeUrl,
		};
	}

	if (isVersionBelow(query.version, row.latestVersion)) {
		return {
			action: "nudge",
			latestVersion: row.latestVersion,
			message: row.message,
			storeUrl: row.storeUrl,
		};
	}

	// Up to date. `latestVersion` and `storeUrl` still go out — a client may show
	// "you're on the latest build" — but `message` is blanked, because the copy
	// was written to explain a block or a nudge and neither applies.
	return {
		action: "none",
		latestVersion: row.latestVersion,
		message: "",
		storeUrl: row.storeUrl,
	};
}

/** Both platforms in one round trip; a missing row surfaces as `null`. */
async function readVersionGate(
	client: VersionGateDbClient
): Promise<AdminVersionGateDto> {
	const rows = await client
		.select({ ...CONFIG_DTO_COLUMNS, platform: appVersionConfig.platform })
		.from(appVersionConfig);

	const android = rows.find((row) => row.platform === "android");
	const ios = rows.find((row) => row.platform === "ios");

	return {
		android: android ? toDto(android) : null,
		ios: ios ? toDto(ios) : null,
	};
}

export async function getAdminVersionGate(
	ctx: Context
): Promise<AdminVersionGateDto> {
	assertAppAdmin(ctx);
	return await readVersionGate(db);
}

async function upsertPlatformConfig(
	tx: DbTransaction,
	platform: "android" | "ios",
	config: AppVersionConfigInput,
	stamp: { updatedAt: Date; updatedBy: string }
): Promise<void> {
	await tx
		.insert(appVersionConfig)
		.values({
			latestVersion: config.latestVersion,
			message: config.message,
			minVersion: config.minVersion,
			platform,
			storeUrl: config.storeUrl,
			updatedAt: stamp.updatedAt,
			updatedBy: stamp.updatedBy,
		})
		.onConflictDoUpdate({
			target: appVersionConfig.platform,
			set: {
				latestVersion: config.latestVersion,
				message: config.message,
				minVersion: config.minVersion,
				storeUrl: config.storeUrl,
				updatedAt: stamp.updatedAt,
				updatedBy: stamp.updatedBy,
			},
		});
}

/**
 * Saves one or both platforms and returns the gate as it now stands.
 *
 * Upsert rather than update: a platform's first save has no row to update, and
 * the admin screen should not have to know whether it is creating or editing.
 * An omitted platform is skipped, never cleared — see `adminVersionGatePutBodySchema`.
 *
 * Both writes **and the read-back** share one transaction, so the response can
 * never show a half-applied save: either both platforms moved or neither did,
 * and the re-read sees exactly the state that committed rather than a snapshot
 * some concurrent admin has since changed underneath it.
 */
export async function putAdminVersionGate(
	ctx: Context,
	body: AdminVersionGatePutBody
): Promise<AdminVersionGateDto> {
	const user = assertAppAdmin(ctx);
	const stamp = { updatedAt: new Date(), updatedBy: user.id };

	return await db.transaction(async (tx) => {
		if (body.android) {
			await upsertPlatformConfig(tx, "android", body.android, stamp);
		}
		if (body.ios) {
			await upsertPlatformConfig(tx, "ios", body.ios, stamp);
		}
		return await readVersionGate(tx);
	});
}
