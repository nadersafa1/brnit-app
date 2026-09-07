import type { SortOrder } from "@brnit/api";
import { toDateStringUTC } from "@brnit/datetime";
import { Badge } from "@brnit/ui/components/badge";
import { Button } from "@brnit/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@brnit/ui/components/dropdown-menu";
import { Skeleton } from "@brnit/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@brnit/ui/components/table";
import {
	BanIcon,
	MoreHorizontalIcon,
	ShieldIcon,
	Trash2Icon,
	UnlockIcon,
	UserCogIcon,
} from "lucide-react";

import { SortableColumnHeader } from "@/components/data-table/sortable-column-header";
import type { AdminUsersSortBy } from "@/lib/admin-users-search";
import type { AdminUser } from "@/lib/api/queries/admin-users";

/**
 * Everyone with an account, as better-auth's admin plugin returns them.
 *
 * There is no detail route: a user is acted on from the row, so the name is
 * plain text and the actions menu is the whole interaction. `banned` is shown
 * with a **text** label as well as a colour, so the state is not colour-alone.
 */

const SKELETON_ROWS = 6;
const COLUMN_COUNT = 6;
const ADMIN_ROLE = "admin";
const FALLBACK_ROLE = "user";

interface AdminUserActions {
	onBan: (user: AdminUser) => void;
	onChangeRole: (user: AdminUser) => void;
	onDelete: (user: AdminUser) => void;
	onImpersonate: (user: AdminUser) => void;
	onUnban: (user: AdminUser) => void;
}

/** Names the row in the menu's accessible label — an id would say nothing. */
function describeUser(user: AdminUser): string {
	return user.name || user.email;
}

function AdminUserRow({
	actions,
	isBusy,
	user,
}: Readonly<{ actions: AdminUserActions; isBusy: boolean; user: AdminUser }>) {
	const role = user.role ?? FALLBACK_ROLE;
	const isBanned = user.banned === true;

	return (
		<TableRow>
			<TableCell className="font-medium">{user.name || "—"}</TableCell>
			<TableCell className="text-muted-foreground">{user.email}</TableCell>
			<TableCell>
				<Badge variant={role === ADMIN_ROLE ? "destructive" : "secondary"}>
					{role}
				</Badge>
			</TableCell>
			<TableCell>
				{isBanned ? (
					<Badge variant="destructive">Banned</Badge>
				) : (
					<span className="text-muted-foreground text-sm">Active</span>
				)}
			</TableCell>
			<TableCell className="text-muted-foreground tabular-nums">
				{toDateStringUTC(user.createdAt)}
			</TableCell>
			<TableCell>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={<Button size="icon-sm" variant="ghost" />}
					>
						<MoreHorizontalIcon aria-hidden />
						<span className="sr-only">Actions for {describeUser(user)}</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							disabled={isBusy}
							onClick={() => actions.onImpersonate(user)}
						>
							<UserCogIcon aria-hidden />
							Impersonate
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={isBusy}
							onClick={() => actions.onChangeRole(user)}
						>
							<ShieldIcon aria-hidden />
							Change role
						</DropdownMenuItem>
						{isBanned ? (
							<DropdownMenuItem
								disabled={isBusy}
								onClick={() => actions.onUnban(user)}
							>
								<UnlockIcon aria-hidden />
								Unban
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem
								disabled={isBusy}
								onClick={() => actions.onBan(user)}
							>
								<BanIcon aria-hidden />
								Ban
							</DropdownMenuItem>
						)}
						<DropdownMenuItem
							disabled={isBusy}
							onClick={() => actions.onDelete(user)}
							variant="destructive"
						>
							<Trash2Icon aria-hidden />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
}

interface AdminUsersTableProps {
	actions: AdminUserActions;
	isBusy: boolean;
	isPending: boolean;
	onSortChange: (sortBy: AdminUsersSortBy, sortOrder: SortOrder) => void;
	sortBy: AdminUsersSortBy;
	sortOrder: SortOrder;
	users: readonly AdminUser[];
}

export function AdminUsersTable({
	actions,
	isBusy,
	isPending,
	onSortChange,
	sortBy,
	sortOrder,
	users,
}: Readonly<AdminUsersTableProps>) {
	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<SortableColumnHeader
							column="name"
							label="Name"
							onSortChange={onSortChange}
							sortBy={sortBy}
							sortOrder={sortOrder}
						/>
						<SortableColumnHeader
							column="email"
							label="Email"
							onSortChange={onSortChange}
							sortBy={sortBy}
							sortOrder={sortOrder}
						/>
						<SortableColumnHeader
							column="role"
							label="Role"
							onSortChange={onSortChange}
							sortBy={sortBy}
							sortOrder={sortOrder}
						/>
						<TableHead>Status</TableHead>
						<SortableColumnHeader
							column="createdAt"
							label="Created"
							onSortChange={onSortChange}
							sortBy={sortBy}
							sortOrder={sortOrder}
						/>
						<TableHead className="w-12">
							<span className="sr-only">Actions</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isPending
						? Array.from({ length: SKELETON_ROWS }, (_, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows have no identity
								<TableRow key={`skeleton-${index}`}>
									<TableCell colSpan={COLUMN_COUNT}>
										<Skeleton className="h-6 w-full" />
									</TableCell>
								</TableRow>
							))
						: users.map((user) => (
								<AdminUserRow
									actions={actions}
									isBusy={isBusy}
									key={user.id}
									user={user}
								/>
							))}
				</TableBody>
			</Table>
		</div>
	);
}
