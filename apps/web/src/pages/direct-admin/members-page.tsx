import { Button } from "@brnit/ui/components/button";
import { Card, CardContent } from "@brnit/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { Building2Icon, UsersIcon } from "lucide-react";
import { useState } from "react";

import { AddAssessmentDialog } from "@/components/direct-admin/add-assessment-dialog";
import { DirectAdminMembersTable } from "@/components/direct-admin/direct-admin-members-table";
import { OrganizationSelect } from "@/components/direct-admin/organization-select";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import {
	type OrganizationMemberRow,
	useAssessableMembers,
} from "@/hooks/use-assessment-members";
import { organizationContextQueryOptions } from "@/lib/api/queries/organization-context";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const MEMBERS_DESCRIPTION =
	"Everyone in this organization with the member role. Record a body composition assessment, or open a member to review their history.";

/**
 * The direct-admin roster.
 *
 * There is no active organization until a session adopts one, and an app admin
 * may never have. That is not an error state — assessments are meaningless
 * without an organization to scope them to, so the screen offers the picker and
 * waits.
 */
function NoOrganizationState() {
	return (
		<ShellPage>
			<ShellPageHeader
				description={MEMBERS_DESCRIPTION}
				eyebrow="Direct admin"
				title="Members"
			/>
			<ShellEmptyState
				action={<OrganizationSelect />}
				description="Assessments belong to a member of one organization. Choose which one you are working in."
				icon={Building2Icon}
				title="Select an organization"
			/>
		</ShellPage>
	);
}

export function MembersPage() {
	const { data: organizationContext } = useQuery(
		organizationContextQueryOptions()
	);
	const activeOrgId = organizationContext?.activeOrgId ?? "";
	const membersQuery = useAssessableMembers(activeOrgId);
	const [addAssessmentFor, setAddAssessmentFor] =
		useState<OrganizationMemberRow | null>(null);

	if (activeOrgId === "") {
		return <NoOrganizationState />;
	}

	const members = membersQuery.data ?? [];
	const isEmpty = !membersQuery.isPending && members.length === 0;

	return (
		<ShellPage>
			<ShellPageHeader
				actions={<OrganizationSelect />}
				description={MEMBERS_DESCRIPTION}
				eyebrow="Direct admin"
				title="Members"
			/>

			<Card>
				<CardContent className="space-y-4 p-4 sm:p-5">
					{membersQuery.isError ? (
						<div className="space-y-3">
							<p className="text-destructive text-sm" role="alert">
								{getUserFacingErrorMessage(
									membersQuery.error,
									"The member list could not be loaded."
								)}
							</p>
							<Button
								onClick={() => membersQuery.refetch()}
								size="sm"
								variant="outline"
							>
								Try again
							</Button>
						</div>
					) : null}

					{isEmpty && !membersQuery.isError ? (
						<ShellEmptyState
							description="Nobody in this organization holds the member role yet. Invite them from the organization screen first."
							icon={UsersIcon}
							title="No members"
						/>
					) : null}

					{isEmpty || membersQuery.isError ? null : (
						<DirectAdminMembersTable
							isPending={membersQuery.isPending}
							members={members}
							onAddAssessment={setAddAssessmentFor}
						/>
					)}
				</CardContent>
			</Card>

			<AddAssessmentDialog
				member={addAssessmentFor}
				onClose={() => setAddAssessmentFor(null)}
			/>
		</ShellPage>
	);
}
