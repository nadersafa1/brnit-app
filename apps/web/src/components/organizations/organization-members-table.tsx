import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@brnit/ui/components/alert-dialog";
import { Button } from "@brnit/ui/components/button";
import { Skeleton } from "@brnit/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@brnit/ui/components/table";
import { useState } from "react";

import { formatOrganizationRole } from "@/components/organizations/organization-role-labels";
import { UpdateMemberRoleDialog } from "@/components/organizations/update-member-role-dialog";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { useRemoveOrganizationMemberMutation } from "@/hooks/use-organization-mutations";
import type { Member } from "@/lib/auth-client";

const SKELETON_ROWS = 4;
const EM_DASH = "—";

interface OrganizationMembersTableProps {
	canManage: boolean;
	/** The signed-in user, so the actor is never offered "remove myself". */
	currentUserId: string | null;
	/** The reason the roster could not be read, if it could not. */
	errorMessage?: string | null;
	isPending: boolean;
	members: readonly Member[];
	organizationId: string;
}

/**
 * The roster.
 *
 * Both destructive affordances are gated on `canManage`, which is
 * `canUpdateMemberRole` from `@brnit/domain` — app admin, owner or direct
 * admin. A `client_admin` sees the list read-only, matching what the server
 * would allow.
 */
export function OrganizationMembersTable({
	canManage,
	currentUserId,
	errorMessage,
	isPending,
	members,
	organizationId,
}: Readonly<OrganizationMembersTableProps>) {
	const [roleTarget, setRoleTarget] = useState<Member | null>(null);
	const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
	const removeMutation = useRemoveOrganizationMemberMutation(organizationId);

	if (errorMessage) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{errorMessage}
			</p>
		);
	}

	if (isPending) {
		return (
			<div className="space-y-2">
				{Array.from({ length: SKELETON_ROWS }, (_, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows have no identity
					<Skeleton className="h-10 w-full" key={`member-skeleton-${index}`} />
				))}
			</div>
		);
	}

	if (members.length === 0) {
		return (
			<ShellEmptyState
				description="Invite someone to get started."
				title="No members yet"
			/>
		);
	}

	const removeTargetName =
		removeTarget?.user.name || removeTarget?.user.email || "this member";

	const confirmRemove = async () => {
		if (!removeTarget) {
			return;
		}
		await removeMutation.mutateAsync(removeTarget.id);
		setRemoveTarget(null);
	};

	return (
		<>
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
							{canManage ? <TableHead>Actions</TableHead> : null}
						</TableRow>
					</TableHeader>
					<TableBody>
						{members.map((member) => (
							<TableRow key={member.id}>
								<TableCell className="font-medium">
									{member.user.name || EM_DASH}
								</TableCell>
								<TableCell className="text-muted-foreground">
									{member.user.email || EM_DASH}
								</TableCell>
								<TableCell>{formatOrganizationRole(member.role)}</TableCell>
								{canManage ? (
									<TableCell>
										<div className="flex flex-wrap gap-2">
											<Button
												onClick={() => setRoleTarget(member)}
												size="sm"
												variant="outline"
											>
												Change role
											</Button>
											{member.userId === currentUserId ? null : (
												<Button
													onClick={() => setRemoveTarget(member)}
													size="sm"
													variant="ghost"
												>
													Remove
												</Button>
											)}
										</div>
									</TableCell>
								) : null}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<UpdateMemberRoleDialog
				displayName={
					roleTarget?.user.name || roleTarget?.user.email || "member"
				}
				memberId={roleTarget?.id ?? ""}
				onOpenChange={(next) => {
					if (!next) {
						setRoleTarget(null);
					}
				}}
				open={roleTarget !== null}
				organizationId={organizationId}
				role={roleTarget?.role ?? ""}
			/>

			<AlertDialog
				onOpenChange={(next) => {
					if (!next) {
						setRemoveTarget(null);
					}
				}}
				open={removeTarget !== null}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove {removeTargetName}?</AlertDialogTitle>
						<AlertDialogDescription>
							They lose access to this organization immediately. Their diet-plan
							assignments and recorded assessments are not deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={removeMutation.isPending}
							nativeButton
							onClick={confirmRemove}
							variant="destructive"
						>
							{removeMutation.isPending ? "Removing…" : "Remove"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
