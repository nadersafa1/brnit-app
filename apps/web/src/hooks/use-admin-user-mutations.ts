import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
	banUser,
	impersonateUser,
	removeUser,
	setUserRole,
	unbanUser,
} from "@/lib/api/queries/admin-users";
import { adminUsersQueries } from "@/lib/api/query-keys";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

/**
 * The five better-auth admin actions the users table offers.
 *
 * They all rewrite the same `user` rows, so each one invalidates the whole
 * `admin-users` family rather than patching a cached page: better-auth answers
 * `{ users, total }` for a `limit`/`offset` window, and a role change or a ban
 * can move a row out of the filtered page it was on.
 *
 * There are no 409s on this surface — the plugin's refusals are 400/403 with a
 * message (`YOU_CANNOT_BAN_YOURSELF`, `YOU_CANNOT_REMOVE_YOURSELF`, …), which
 * the toast surfaces verbatim.
 */

/** After impersonating, the whole app is a different user — reload, don't navigate. */
const DASHBOARD_PATH = "/dashboard";

function useInvalidateAdminUsers() {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: adminUsersQueries() });
}

export interface SetUserRoleVariables {
	role: string;
	userId: string;
}

export function useSetUserRoleMutation() {
	const invalidateAdminUsers = useInvalidateAdminUsers();

	return useMutation({
		mutationFn: ({ role, userId }: SetUserRoleVariables) =>
			setUserRole(userId, role),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not update the role")
			);
		},
		onSuccess: async () => {
			toast.success("Role updated");
			await invalidateAdminUsers();
		},
	});
}

export function useBanUserMutation() {
	const invalidateAdminUsers = useInvalidateAdminUsers();

	return useMutation({
		mutationFn: (userId: string) => banUser(userId),
		onError: (error) => {
			toast.error(getUserFacingErrorMessage(error, "Could not ban the user"));
		},
		onSuccess: async () => {
			toast.success("User banned");
			await invalidateAdminUsers();
		},
	});
}

export function useUnbanUserMutation() {
	const invalidateAdminUsers = useInvalidateAdminUsers();

	return useMutation({
		mutationFn: (userId: string) => unbanUser(userId),
		onError: (error) => {
			toast.error(getUserFacingErrorMessage(error, "Could not unban the user"));
		},
		onSuccess: async () => {
			toast.success("User unbanned");
			await invalidateAdminUsers();
		},
	});
}

export function useRemoveUserMutation() {
	const invalidateAdminUsers = useInvalidateAdminUsers();

	return useMutation({
		mutationFn: (userId: string) => removeUser(userId),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not delete the user")
			);
		},
		onSuccess: async () => {
			toast.success("User deleted");
			await invalidateAdminUsers();
		},
	});
}

/**
 * Swaps the session cookie for the target user's, then does a **full page
 * load**. A client-side navigation would keep every cached query — all of it
 * the admin's data — and the shell would render the wrong person.
 */
export function useImpersonateUserMutation() {
	return useMutation({
		mutationFn: (userId: string) => impersonateUser(userId),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not impersonate the user")
			);
		},
		onSuccess: () => {
			toast.success("Impersonating — reloading");
			globalThis.location.href = DASHBOARD_PATH;
		},
	});
}
