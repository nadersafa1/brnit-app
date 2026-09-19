import type { AdminVersionGateDto, AdminVersionGatePutBody } from "@brnit/api";
import { queryOptions } from "@tanstack/react-query";

import { fetchApiJson } from "@/lib/api/client";
import { adminVersionGateQueryKey } from "@/lib/api/query-keys";

const ADMIN_VERSION_GATE_PATH = "/api/admin/version-gate";

/**
 * The gate as it is stored, both platforms at once.
 *
 * A platform comes back as `null` when it has no row, which is the gate being
 * **off** for it — not an error and not a half-loaded payload. The screen binds
 * that to an empty, unsaved form.
 *
 * No `meta.showErrorToast`: this is a single-record read and the page renders
 * its own inline error card, so a toast would say the same thing twice. It also
 * matters here because `requireAdmin` answers **401** (not 403) to a signed-in
 * non-admin — the sentence belongs on the screen that asked for it, and nothing
 * in this app treats a 401 as a reason to end the session.
 */
export function adminVersionGateQueryOptions() {
	return queryOptions({
		queryFn: () => fetchApiJson<AdminVersionGateDto>(ADMIN_VERSION_GATE_PATH),
		queryKey: adminVersionGateQueryKey(),
	});
}

/**
 * Upserts the platforms present in the body and answers with the gate as it now
 * stands. An omitted platform is left untouched, so the screen always sends
 * both rather than relying on the server to preserve the half it did not edit.
 */
export function putAdminVersionGate(
	body: AdminVersionGatePutBody
): Promise<AdminVersionGateDto> {
	return fetchApiJson<AdminVersionGateDto>(ADMIN_VERSION_GATE_PATH, {
		body: JSON.stringify(body),
		method: "PUT",
	});
}
