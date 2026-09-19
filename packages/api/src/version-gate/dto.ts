/**
 * Wire types for the app version gate.
 *
 * The split between the two response shapes is the point of the feature: the
 * public endpoint returns a **decision**, the admin endpoint returns the
 * **configuration** that produced it.
 */

/**
 * What the native app should do, decided server-side.
 *
 * - `block` — hard stop; the user cannot continue on this build.
 * - `nudge` — a dismissible prompt; a newer build exists.
 * - `none` — carry on.
 *
 * The client never compares versions itself. Shipping the comparison to the
 * client would mean the rules could only ever be changed by shipping a new
 * build — precisely the thing the gate exists to work around when a build in
 * the wild has to be retired.
 */
export type AppVersionAction = "block" | "nudge" | "none";

/**
 * `GET /app-version` response.
 *
 * Note what is **absent**: `minVersion`. This endpoint is public and unmetered,
 * so the blocking threshold would be readable by anyone; publishing it tells an
 * attacker exactly which builds are still accepted. The client has no use for
 * it either — it is handed the decision, not the inputs.
 *
 * `message` and `storeUrl` are blank strings rather than `null` so the native
 * client can bind them without null checks; on a `none` decision `message` is
 * deliberately blanked, because the copy is written for a user who is being
 * blocked or nudged and would read as nonsense to anyone else.
 */
export interface AppVersionResponse {
	action: AppVersionAction;
	latestVersion: string;
	message: string;
	storeUrl: string;
}

/** One platform's stored configuration, as the admin screen edits it. */
export interface AppVersionConfigDto {
	latestVersion: string;
	message: string;
	minVersion: string;
	storeUrl: string;
}

/**
 * `GET`/`PUT /admin/version-gate` response — both platforms in one payload.
 *
 * `null` means "no row", which is the gate being **off** for that platform, not
 * an error and not a partially-loaded state. The admin UI should render that as
 * an empty, unsaved form.
 */
export interface AdminVersionGateDto {
	android: AppVersionConfigDto | null;
	ios: AppVersionConfigDto | null;
}
