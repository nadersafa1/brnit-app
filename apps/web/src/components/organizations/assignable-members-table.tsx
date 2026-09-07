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
import { Link } from "@tanstack/react-router";
import { UsersIcon } from "lucide-react";

import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import type { Member } from "@/lib/auth-client";

const SKELETON_ROWS = 4;
const EM_DASH = "—";
const MEMBER_ROUTE =
	"/dashboard/organizations/$organizationId/members/$memberId";

interface AssignableMembersTableProps {
	/** The reason the roster could not be read, if it could not. */
	errorMessage?: string | null;
	isPending: boolean;
	/** Already filtered to org role `member` — staff cannot hold a plan. */
	members: readonly Member[];
	organizationId: string;
}

/**
 * The people a nutritionist can act on.
 *
 * Only an org role of exactly `member` may be assigned a diet plan
 * (`api-surface.md` §8.3), so the roster is filtered before it reaches here
 * rather than showing staff rows that lead to a screen refusing to work.
 */
export function AssignableMembersTable({
	errorMessage,
	isPending,
	members,
	organizationId,
}: Readonly<AssignableMembersTableProps>) {
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
					<Skeleton className="h-10 w-full" key={`assignable-${index}`} />
				))}
			</div>
		);
	}

	if (members.length === 0) {
		return (
			<ShellEmptyState
				description="Nobody in this organization holds the Member role yet, so there is no one to assign a plan to."
				icon={UsersIcon}
				title="No assignable members"
			/>
		);
	}

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Actions</TableHead>
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
							<TableCell>
								<Button
									render={
										<Link
											params={{ memberId: member.id, organizationId }}
											to={MEMBER_ROUTE}
										/>
									}
									size="sm"
									variant="outline"
								>
									Manage diet plans
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
