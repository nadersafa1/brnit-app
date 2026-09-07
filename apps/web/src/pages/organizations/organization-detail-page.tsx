import { ORGANIZATION_MEMBER_ROLE } from "@brnit/domain";
import { Button } from "@brnit/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@brnit/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@brnit/ui/components/dialog";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { AssignableMembersTable } from "@/components/organizations/assignable-members-table";
import { InviteMemberForm } from "@/components/organizations/invite-member-form";
import { OrganizationInvitationsCard } from "@/components/organizations/organization-invitations-card";
import { OrganizationMembersTable } from "@/components/organizations/organization-members-table";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { useOrganizationAccess } from "@/hooks/use-organization-access";
import { useOrganizationActiveSync } from "@/hooks/use-organization-active-sync";
import {
	organizationMembersQueryOptions,
	organizationQueryOptions,
	organizationsQueryOptions,
} from "@/lib/api/queries/organizations";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const ROUTE_ID = "/dashboard/organizations/$organizationId/";
const LIST_PATH = "/dashboard/organizations";

function BackToOrganizations() {
	return (
		<Button render={<Link to={LIST_PATH} />} size="sm" variant="ghost">
			<ArrowLeftIcon aria-hidden />
			Back to organizations
		</Button>
	);
}

/**
 * One organization: who is in it, who has been invited, and — for a
 * nutritionist — who can be given a diet plan.
 *
 * Opening the screen moves the session's **active** organization here, because
 * the assignment and assessment endpoints scope themselves to it and ignore any
 * id in the request.
 *
 * The roster comes from `listMembers`, which every member may call; the
 * invitations come from `getFullOrganization` and are fetched only for someone
 * allowed to manage them. That split is why a plain member never triggers a
 * request the server would refuse.
 */
export function OrganizationDetailPage() {
	const { organizationId } = useParams({ from: ROUTE_ID });
	const { canInvite, canManageMembers, isAppAdmin, isNutritionist, userId } =
		useOrganizationAccess();
	useOrganizationActiveSync(organizationId);

	const [isInviteOpen, setInviteOpen] = useState(false);

	const organizationsQuery = useQuery(organizationsQueryOptions());
	const membersQuery = useQuery(
		organizationMembersQueryOptions(organizationId)
	);
	const invitationsQuery = useQuery(
		organizationQueryOptions(organizationId, canInvite)
	);

	const organizations = organizationsQuery.data ?? [];
	const organization = organizations.find(
		(candidate) => candidate.id === organizationId
	);
	const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
	const membersError = membersQuery.isError
		? getUserFacingErrorMessage(
				membersQuery.error,
				"The members of this organization could not be loaded."
			)
		: null;

	const assignableMembers = useMemo(
		() => members.filter((member) => member.role === ORGANIZATION_MEMBER_ROLE),
		[members]
	);

	// An app admin has no membership row anywhere, so an empty list is normal for
	// them; for everyone else, an organization missing from a loaded list is one
	// they were removed from or never belonged to.
	const isOutsider =
		!organizationsQuery.isPending &&
		organizations.length > 0 &&
		organization === undefined;

	if (isOutsider) {
		return (
			<ShellPage width="mediumWide">
				<BackToOrganizations />
				<ShellPageHeader eyebrow="Organization" title="No access" />
				<Card>
					<CardContent className="p-6">
						<p className="text-sm" role="alert">
							You are not a member of this organization.
						</p>
					</CardContent>
				</Card>
			</ShellPage>
		);
	}

	const title = organization?.name ?? "Organization";

	// A nutritionist who is not an app admin gets the working view: the people
	// they can plan for, and nothing they cannot act on.
	if (isNutritionist && !isAppAdmin) {
		return (
			<ShellPage>
				<BackToOrganizations />
				<ShellPageHeader
					description="Members you can build and assign diet plans for."
					eyebrow="Organization"
					title={title}
				/>
				<Card>
					<CardHeader>
						<CardTitle>Members</CardTitle>
					</CardHeader>
					<CardContent>
						<AssignableMembersTable
							errorMessage={membersError}
							isPending={membersQuery.isPending}
							members={assignableMembers}
							organizationId={organizationId}
						/>
					</CardContent>
				</Card>
			</ShellPage>
		);
	}

	return (
		<ShellPage>
			<BackToOrganizations />
			<ShellPageHeader
				description={
					organization?.slug
						? `Slug: ${organization.slug}`
						: "Members and invitations for this organization."
				}
				eyebrow="Organization"
				title={title}
			/>

			{canInvite ? (
				<OrganizationInvitationsCard
					invitations={invitationsQuery.data?.invitations ?? []}
					isPending={invitationsQuery.isPending}
					onInvite={() => setInviteOpen(true)}
					organizationId={organizationId}
				/>
			) : (
				<p className="text-muted-foreground text-sm">
					Only owners and direct admins can invite people to this organization.
				</p>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Members</CardTitle>
				</CardHeader>
				<CardContent>
					<OrganizationMembersTable
						canManage={canManageMembers}
						currentUserId={userId}
						errorMessage={membersError}
						isPending={membersQuery.isPending}
						members={members}
						organizationId={organizationId}
					/>
				</CardContent>
			</Card>

			<Dialog onOpenChange={setInviteOpen} open={isInviteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Invite member</DialogTitle>
						<DialogDescription>
							They receive an email with a link that joins them to this
							organization. Invitations expire after seven days.
						</DialogDescription>
					</DialogHeader>
					<InviteMemberForm
						onCancel={() => setInviteOpen(false)}
						onInvited={() => setInviteOpen(false)}
						organizationId={organizationId}
					/>
				</DialogContent>
			</Dialog>
		</ShellPage>
	);
}
