import type { AdminVersionGatePutBody } from "@brnit/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { putAdminVersionGate } from "@/lib/api/queries/version-gate";
import { adminVersionGateQueryKey } from "@/lib/api/query-keys";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

/**
 * The single write on the version gate, in the shape every mutation on this app
 * follows: `mutationFn` -> `onError` toasts the server's reason -> `onSuccess`
 * toasts, then **awaits** the invalidation so `isPending` stays true until the
 * cache has actually caught up.
 *
 * There is no named invalidation helper because there is no fan-out: one key
 * holds the whole gate.
 */
export function useSaveVersionGateMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (body: AdminVersionGatePutBody) => putAdminVersionGate(body),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not save the version gate")
			);
		},
		onSuccess: async () => {
			toast.success("Version gate saved");
			await queryClient.invalidateQueries({
				queryKey: adminVersionGateQueryKey(),
			});
		},
	});
}
