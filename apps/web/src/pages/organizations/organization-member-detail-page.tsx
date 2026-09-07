import { ORGANIZATION_MEMBER_ROLE } from "@brnit/domain";
import { Button } from "@brnit/ui/components/button";
import {
	Card,
	CardAction,
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
import { Skeleton } from "@brnit/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { AssignmentForm } from "@/components/organizations/assignment-form";
import { CreateDietPlanForm } from "@/components/organizations/create-diet-plan-form";
import { MemberAssessmentsTable } from "@/components/organizations/member-assessments-table";
import { MemberAssignmentsTable } from "@/components/organizations/member-assignments-table";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { useOrganizationActiveSync } from "@/hooks/use-organization-active-sync";
import { memberAssessmentsQueryOptions } from "@/lib/api/queries/organization-assessments";
import { dietPlanAssignmentsQueryOptions } from "@/lib/api/queries/organization-diet-plan-assignments";
import { dietPlanPickerQueryOptions } from "@/lib/api/queries/organization-diet-plans";
import { organizationMembersQueryOptions } from "@/lib/api/queries/organizations";

const ROUTE_ID = "/dashboard/organizations/$organizationId/members/$memberId";
const ORGANIZATION_ROUTE = "/dashboard/organizations/$organizationId";

/**
 * One member's nutrition record: the plans they hold, and the body-composition
 * readings taken for them.
 *
 * Only an org role of exactly `member` may be assigned a plan
 * (`api-surface.md` §8.3), so the roster is filtered to that role before the
 * lookup — a staff id in the URL lands on "not found" rather than on a screen
 * whose every action the server would refuse.
 */
export function OrganizationMemberDetailPage() {
	const { memberId, organizationId } = useParams({ from: ROUTE_ID });
	const { isActive } = useOrganizationActiveSync(organizationId);

	const [isAssignOpen, setAssignOpen] = useState(false);
	const [isCreatePlanOpen, setCreatePlanOpen] = useState(false);
	const [preselectedDietPlanId, setPreselectedDietPlanId] = useState<
		string | undefined
	>();

	const membersQuery = useQuery(
		organizationMembersQueryOptions(organizationId)
	);
	const assignmentsQuery = useQuery(
		dietPlanAssignmentsQueryOptions(organizationId, isActive)
	);
	const assessmentsQuery = useQuery(
		memberAssessmentsQueryOptions(organizationId, memberId, isActive)
	);
	const plansQuery = useQuery(dietPlanPickerQueryOptions());

	const member = membersQuery.data?.find(
		(candidate) =>
			candidate.id === memberId && candidate.role === ORGANIZATION_MEMBER_ROLE
	);

	// The list endpoint is scoped to the organization, not to one member, so the
	// member's rows are selected out of the shared organization-wide cache entry.
	const assignments = useMemo(
		() =>
			(assignmentsQuery.data ?? []).filter(
				(assignment) => assignment.memberId === memberId
			),
		[assignmentsQuery.data, memberId]
	);

	const planNames = useMemo(
		() =>
			new Map(
				(plansQuery.data?.data ?? []).map((plan) => [plan.id, plan.name])
			),
		[plansQuery.data]
	);

	const backLink = (
		<Button
			render={<Link params={{ organizationId }} to={ORGANIZATION_ROUTE} />}
			size="sm"
			variant="ghost"
		>
			<ArrowLeftIcon aria-hidden />
			Back to the organization
		</Button>
	);

	if (membersQuery.isPending) {
		return (
			<ShellPage>
				<Skeleton className="h-9 w-48" />
				<Skeleton className="h-64 w-full" />
			</ShellPage>
		);
	}

	if (!member) {
		return (
			<ShellPage width="mediumWide">
				{backLink}
				<ShellPageHeader eyebrow="Member" title="Member not found" />
				<Card>
					<CardContent className="p-6">
						<p className="text-sm" role="alert">
							This member could not be found, or they do not hold the Member
							role in this organization — only members can be assigned a diet
							plan.
						</p>
					</CardContent>
				</Card>
			</ShellPage>
		);
	}

	const openAssignDialog = (dietPlanId?: string) => {
		setPreselectedDietPlanId(dietPlanId);
		setAssignOpen(true);
	};

	return (
		<ShellPage>
			{backLink}
			<ShellPageHeader
				description={member.user.email}
				eyebrow="Member"
				title={member.user.name || member.user.email}
			/>

			<Card>
				<CardHeader>
					<CardTitle>Diet plan assignments</CardTitle>
					<CardAction>
						<div className="flex flex-wrap gap-2">
							<Button
								onClick={() => openAssignDialog()}
								size="sm"
								variant="outline"
							>
								Assign existing plan
							</Button>
							<Button onClick={() => setCreatePlanOpen(true)} size="sm">
								<PlusIcon aria-hidden />
								Create and assign
							</Button>
						</div>
					</CardAction>
				</CardHeader>
				<CardContent>
					<MemberAssignmentsTable
						assignments={assignments}
						isPending={assignmentsQuery.isPending}
						memberId={memberId}
						planNames={planNames}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Body composition assessments</CardTitle>
				</CardHeader>
				<CardContent>
					<MemberAssessmentsTable
						assessments={assessmentsQuery.data?.data ?? []}
						isPending={assessmentsQuery.isPending}
					/>
				</CardContent>
			</Card>

			<Dialog onOpenChange={setAssignOpen} open={isAssignOpen}>
				<DialogContent className="max-h-[90svh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Assign a diet plan</DialogTitle>
						<DialogDescription>
							A person holds at most one plan on any given day, across every
							organization — an overlapping window is refused.
						</DialogDescription>
					</DialogHeader>
					{/*
					 * Remounted per opening so the dates reset to today and the plan
					 * preselection from "create and assign" is picked up.
					 */}
					{isAssignOpen ? (
						<AssignmentForm
							key={preselectedDietPlanId ?? "new"}
							memberId={memberId}
							onCancel={() => setAssignOpen(false)}
							onSaved={() => setAssignOpen(false)}
							preselectedDietPlanId={preselectedDietPlanId}
						/>
					) : null}
				</DialogContent>
			</Dialog>

			<Dialog onOpenChange={setCreatePlanOpen} open={isCreatePlanOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create a diet plan</DialogTitle>
						<DialogDescription>
							The plan starts empty; its meals are built in the plan editor. You
							can assign it to this member straight away.
						</DialogDescription>
					</DialogHeader>
					<CreateDietPlanForm
						onCancel={() => setCreatePlanOpen(false)}
						onCreated={(dietPlanId) => {
							setCreatePlanOpen(false);
							openAssignDialog(dietPlanId);
						}}
					/>
				</DialogContent>
			</Dialog>
		</ShellPage>
	);
}
