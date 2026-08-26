import { APP_ROLES } from "@brnit/domain";
import { Card, CardContent } from "@brnit/ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@brnit/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { UsersIcon } from "lucide-react";
import { useState } from "react";

import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { ChangeUserRoleDialog } from "@/components/admin/change-user-role-dialog";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import {
	useBanUserMutation,
	useImpersonateUserMutation,
	useRemoveUserMutation,
	useSetUserRoleMutation,
	useUnbanUserMutation,
} from "@/hooks/use-admin-user-mutations";
import type { AdminUsersSearch } from "@/lib/admin-users-search";
import type { AdminUser } from "@/lib/api/queries/admin-users";
import { adminUsersQueryOptions } from "@/lib/api/queries/admin-users";

const ROUTE_ID = "/dashboard/admin/";
const FIRST_PAGE = 1;
const ALL_ROLES = "all";

/** Names a person in a confirmation. The email is the only field always present. */
function describeUser(user: AdminUser | null): string {
	if (!user) {
		return "this user";
	}
	return user.name || user.email;
}

/**
 * Everyone with an account.
 *
 * The list is better-auth's, not `apps/server`'s — the admin plugin owns the
 * `user` table — but the screen follows the same rules as every other list:
 * **all table state lives in the URL**, so a filtered view is shareable,
 * survives a refresh, and the back button walks through it.
 *
 * The five actions are the ones the plugin exposes. Ban and delete confirm
 * first; impersonation does not, because it is reversible from the top bar and
 * a confirmation for it would be noise.
 */
export function AdminUsersPage() {
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });

	const [roleUser, setRoleUser] = useState<AdminUser | null>(null);
	const [userToBan, setUserToBan] = useState<AdminUser | null>(null);
	const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

	const usersQuery = useQuery(adminUsersQueryOptions(search));

	const setRoleMutation = useSetUserRoleMutation();
	const banMutation = useBanUserMutation();
	const unbanMutation = useUnbanUserMutation();
	const removeMutation = useRemoveUserMutation();
	const impersonateMutation = useImpersonateUserMutation();

	const isBusy =
		setRoleMutation.isPending ||
		banMutation.isPending ||
		unbanMutation.isPending ||
		removeMutation.isPending ||
		impersonateMutation.isPending;

	/** Any filter change resets to page 1 — page 7 of a new filter is meaningless. */
	const applySearch = (next: Partial<AdminUsersSearch>) => {
		navigate({
			search: (current) => ({ ...current, page: FIRST_PAGE, ...next }),
		});
	};

	const confirmRole = (role: string) => {
		if (!roleUser) {
			return;
		}
		setRoleMutation.mutate(
			{ role, userId: roleUser.id },
			{ onSuccess: () => setRoleUser(null) }
		);
	};

	const confirmBan = () => {
		if (!userToBan) {
			return;
		}
		banMutation.mutate(userToBan.id, { onSuccess: () => setUserToBan(null) });
	};

	const confirmDelete = () => {
		if (!userToDelete) {
			return;
		}
		removeMutation.mutate(userToDelete.id, {
			onSuccess: () => setUserToDelete(null),
		});
	};

	const users = usersQuery.data?.users ?? [];
	const pagination = usersQuery.data?.pagination;
	const isEmpty = !usersQuery.isPending && users.length === 0;
	const hasFilters = search.q.length > 0 || search.role.length > 0;

	return (
		<ShellPage>
			<ShellPageHeader
				description="Everyone with a brnit account. Roles here are app roles; organization roles are managed per organization."
				eyebrow="Admin"
				title="Users"
			/>

			<Card>
				<CardContent className="space-y-4 p-4 sm:p-5">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<DataTableSearch
							label="Search users by email"
							onSearchChange={(q) => applySearch({ q })}
							placeholder="Search by email"
							value={search.q}
						/>
						<Select
							onValueChange={(value: string | null) =>
								applySearch({
									role: value === null || value === ALL_ROLES ? "" : value,
								})
							}
							value={search.role === "" ? ALL_ROLES : search.role}
						>
							<SelectTrigger
								aria-label="Filter by role"
								className="sm:w-48"
								size="sm"
							>
								<SelectValue placeholder="All roles" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL_ROLES}>All roles</SelectItem>
								{APP_ROLES.map((role) => (
									<SelectItem key={role} value={role}>
										{role}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{isEmpty ? (
						<ShellEmptyState
							description={
								hasFilters
									? "No account matches these filters. Try a different email or role."
									: "No accounts have been created yet."
							}
							icon={UsersIcon}
							title="No users"
						/>
					) : (
						<AdminUsersTable
							actions={{
								onBan: setUserToBan,
								onChangeRole: setRoleUser,
								onDelete: setUserToDelete,
								onImpersonate: (user) => impersonateMutation.mutate(user.id),
								onUnban: (user) => unbanMutation.mutate(user.id),
							}}
							isBusy={isBusy}
							isPending={usersQuery.isPending}
							onSortChange={(sortBy, sortOrder) =>
								applySearch({ sortBy, sortOrder })
							}
							sortBy={search.sortBy}
							sortOrder={search.sortOrder}
							users={users}
						/>
					)}

					{pagination ? (
						<DataTablePagination
							itemLabel="users"
							onPageChange={(page) =>
								navigate({ search: (current) => ({ ...current, page }) })
							}
							onPerPageChange={(perPage) => applySearch({ perPage })}
							pagination={pagination}
						/>
					) : null}
				</CardContent>
			</Card>

			<ChangeUserRoleDialog
				isSaving={setRoleMutation.isPending}
				onConfirm={confirmRole}
				onOpenChange={(open) => {
					if (!open) {
						setRoleUser(null);
					}
				}}
				open={roleUser !== null}
				user={roleUser}
			/>

			<DeleteConfirmDialog
				confirmLabel="Ban"
				description={`Ban ${describeUser(userToBan)}? They will not be able to sign in and their sessions are revoked.`}
				isDeleting={banMutation.isPending}
				onConfirm={confirmBan}
				onOpenChange={(open) => {
					if (!open) {
						setUserToBan(null);
					}
				}}
				open={userToBan !== null}
				pendingLabel="Banning…"
				title="Ban user"
			/>

			<DeleteConfirmDialog
				description={`Permanently delete ${describeUser(userToDelete)}? This cannot be undone.`}
				isDeleting={removeMutation.isPending}
				onConfirm={confirmDelete}
				onOpenChange={(open) => {
					if (!open) {
						setUserToDelete(null);
					}
				}}
				open={userToDelete !== null}
				title="Delete user"
			/>
		</ShellPage>
	);
}
