import type { AssessmentDto } from "@brnit/api";
import { Button } from "@brnit/ui/components/button";
import { Card, CardContent } from "@brnit/ui/components/card";
import { Skeleton } from "@brnit/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
	ActivityIcon,
	ArrowLeftIcon,
	Building2Icon,
	PlusIcon,
	UserXIcon,
} from "lucide-react";
import { useState } from "react";

import { AddAssessmentDialog } from "@/components/direct-admin/add-assessment-dialog";
import { AssessmentsTable } from "@/components/direct-admin/assessments-table";
import { EditAssessmentDialog } from "@/components/direct-admin/edit-assessment-dialog";
import { memberDisplayName } from "@/components/direct-admin/member-display";
import { OrganizationSelect } from "@/components/direct-admin/organization-select";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import {
	type OrganizationMemberRow,
	useAssessableMember,
} from "@/hooks/use-assessment-members";
import { memberAssessmentsQueryOptions } from "@/lib/api/queries/assessments";
import { organizationContextQueryOptions } from "@/lib/api/queries/organization-context";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const ROUTE_ID = "/dashboard/direct-admin/members/$memberId";
const LIST_PATH = "/dashboard/direct-admin/members";

function BackToMembers() {
	return (
		<Button render={<Link to={LIST_PATH} />} size="sm" variant="ghost">
			<ArrowLeftIcon aria-hidden />
			Back to members
		</Button>
	);
}

/**
 * A member's body-composition history.
 *
 * The member's identity comes from the organization roster rather than from the
 * assessment rows: a member with no assessments yet still has a name, and a
 * `$memberId` that is not an assessable member of the active organization has to
 * read as "not found here" rather than as an empty list.
 */
export function MemberAssessmentsPage() {
	const { memberId } = useParams({ from: ROUTE_ID });
	const { data: organizationContext } = useQuery(
		organizationContextQueryOptions()
	);
	const activeOrgId = organizationContext?.activeOrgId ?? "";

	const memberQuery = useAssessableMember(activeOrgId, memberId);
	const assessmentsQuery = useQuery(
		memberAssessmentsQueryOptions("direct-admin", activeOrgId, memberId)
	);

	const [isAddOpen, setAddOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<AssessmentDto | null>(null);

	if (activeOrgId === "") {
		return (
			<ShellPage width="mediumWide">
				<BackToMembers />
				<ShellEmptyState
					action={<OrganizationSelect />}
					description="Assessments belong to a member of one organization. Choose which one you are working in."
					icon={Building2Icon}
					title="Select an organization"
				/>
			</ShellPage>
		);
	}

	if (memberQuery.isPending) {
		return (
			<ShellPage width="mediumWide">
				<Skeleton className="h-9 w-40" />
				<Skeleton className="h-64 w-full" />
			</ShellPage>
		);
	}

	const member: OrganizationMemberRow | null = memberQuery.data ?? null;

	if (!member) {
		return (
			<ShellPage width="mediumWide">
				<BackToMembers />
				<ShellEmptyState
					description="This member is not part of the active organization, or no longer holds the member role."
					icon={UserXIcon}
					title="Member not found"
				/>
			</ShellPage>
		);
	}

	const assessments = assessmentsQuery.data?.data ?? [];
	const isEmpty = !assessmentsQuery.isPending && assessments.length === 0;

	return (
		<ShellPage width="mediumWide">
			<BackToMembers />
			<ShellPageHeader
				actions={
					<Button onClick={() => setAddOpen(true)} size="sm">
						<PlusIcon aria-hidden />
						Add assessment
					</Button>
				}
				description={member.user.email}
				eyebrow="Body composition"
				title={memberDisplayName(member)}
			/>

			<Card>
				<CardContent className="space-y-4 p-4 sm:p-5">
					{assessmentsQuery.isError ? (
						<div className="space-y-3">
							<p className="text-destructive text-sm" role="alert">
								{getUserFacingErrorMessage(
									assessmentsQuery.error,
									"These assessments could not be loaded."
								)}
							</p>
							<Button
								onClick={() => assessmentsQuery.refetch()}
								size="sm"
								variant="outline"
							>
								Try again
							</Button>
						</div>
					) : null}

					{isEmpty && !assessmentsQuery.isError ? (
						<ShellEmptyState
							description="Add the first assessment to start tracking this member's body composition."
							icon={ActivityIcon}
							title="No assessments yet"
						/>
					) : null}

					{isEmpty || assessmentsQuery.isError ? null : (
						<AssessmentsTable
							assessments={assessments}
							isPending={assessmentsQuery.isPending}
							onEdit={setEditTarget}
						/>
					)}
				</CardContent>
			</Card>

			<AddAssessmentDialog
				member={isAddOpen ? member : null}
				onClose={() => setAddOpen(false)}
			/>
			<EditAssessmentDialog
				assessment={editTarget}
				onClose={() => setEditTarget(null)}
			/>
		</ShellPage>
	);
}
