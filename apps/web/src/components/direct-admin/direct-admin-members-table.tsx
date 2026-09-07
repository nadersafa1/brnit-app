import { Badge } from "@brnit/ui/components/badge";
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
import { ActivityIcon, PlusIcon } from "lucide-react";

import {
	formatOrganizationRole,
	type OrganizationMemberRow,
} from "@/hooks/use-assessment-members";

const SKELETON_ROWS = 5;
const COLUMN_COUNT = 4;
const MEMBER_DETAIL_ROUTE = "/dashboard/direct-admin/members/$memberId";

function MemberRow({
	member,
	onAddAssessment,
}: Readonly<{
	member: OrganizationMemberRow;
	onAddAssessment: (member: OrganizationMemberRow) => void;
}>) {
	return (
		<TableRow>
			<TableCell>
				{/*
				 * A real `<Link>`, not a row `onClick`: it is reachable by keyboard,
				 * announced as a link, and opens in a new tab on middle-click.
				 */}
				<Link
					className="font-medium text-foreground outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-accent"
					params={{ memberId: member.id }}
					to={MEMBER_DETAIL_ROUTE}
				>
					{member.user.name || "Unnamed member"}
				</Link>
			</TableCell>
			<TableCell className="text-muted-foreground">
				{member.user.email || "—"}
			</TableCell>
			<TableCell>
				<Badge variant="secondary">{formatOrganizationRole(member.role)}</Badge>
			</TableCell>
			<TableCell className="text-right">
				<div className="flex justify-end gap-2">
					<Button
						onClick={() => onAddAssessment(member)}
						size="sm"
						variant="outline"
					>
						<PlusIcon aria-hidden />
						Add assessment
					</Button>
					<Button
						render={
							<Link params={{ memberId: member.id }} to={MEMBER_DETAIL_ROUTE} />
						}
						size="sm"
						variant="ghost"
					>
						<ActivityIcon aria-hidden />
						View assessments
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}

interface DirectAdminMembersTableProps {
	isPending: boolean;
	members: readonly OrganizationMemberRow[];
	onAddAssessment: (member: OrganizationMemberRow) => void;
}

/** The organization's assessable members. Filtering happens before this. */
export function DirectAdminMembersTable({
	isPending,
	members,
	onAddAssessment,
}: Readonly<DirectAdminMembersTableProps>) {
	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Role</TableHead>
						<TableHead className="text-right">
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
						: members.map((member) => (
								<MemberRow
									key={member.id}
									member={member}
									onAddAssessment={onAddAssessment}
								/>
							))}
				</TableBody>
			</Table>
		</div>
	);
}
