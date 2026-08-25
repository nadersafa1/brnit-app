import { Button } from "@brnit/ui/components/button";
import { Card, CardContent } from "@brnit/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@brnit/ui/components/dialog";
import { Skeleton } from "@brnit/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@brnit/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Building2Icon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { useOrganizationAccess } from "@/hooks/use-organization-access";
import { organizationsQueryOptions } from "@/lib/api/queries/organizations";

const SKELETON_ROWS = 3;
const DETAIL_ROUTE = "/dashboard/organizations/$organizationId";

/**
 * Every organization the signed-in user belongs to.
 *
 * There is no search, sort or pagination here on purpose: better-auth's
 * `listOrganizations` returns the user's memberships whole, and a person is in
 * a handful of organizations, not hundreds — so there is no table state to put
 * in the URL.
 */
export function OrganizationsPage() {
	const navigate = useNavigate();
	const { isAppAdmin } = useOrganizationAccess();
	const [isCreateOpen, setCreateOpen] = useState(false);

	const organizationsQuery = useQuery(organizationsQueryOptions());
	const organizations = organizationsQuery.data ?? [];
	const isEmpty = !organizationsQuery.isPending && organizations.length === 0;

	const openOrganization = (organizationId: string) => {
		navigate({ params: { organizationId }, to: DETAIL_ROUTE });
	};

	return (
		<ShellPage>
			<ShellPageHeader
				actions={
					isAppAdmin ? (
						<Button onClick={() => setCreateOpen(true)} size="sm">
							<PlusIcon aria-hidden />
							Create organization
						</Button>
					) : null
				}
				description="The organizations you belong to. Open one to manage its members, invitations and diet-plan assignments."
				eyebrow="Workspace"
				title="Organizations"
			/>

			{isEmpty ? (
				<ShellEmptyState
					description={
						isAppAdmin
							? "Create the first organization to start inviting members."
							: "You are not in any organization yet. Ask an admin to invite you."
					}
					icon={Building2Icon}
					title="No organizations"
				/>
			) : (
				<Card>
					<CardContent className="p-4 sm:p-5">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Slug</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{organizationsQuery.isPending
										? Array.from({ length: SKELETON_ROWS }, (_, index) => (
												// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows have no identity
												<TableRow key={`skeleton-${index}`}>
													<TableCell colSpan={2}>
														<Skeleton className="h-6 w-full" />
													</TableCell>
												</TableRow>
											))
										: organizations.map((organization) => (
												<TableRow
													className="cursor-pointer"
													key={organization.id}
													onClick={() => openOrganization(organization.id)}
												>
													<TableCell>
														{/*
														 * The row is clickable for the mouse, but the name
														 * is a real link so the row is reachable by
														 * keyboard and can be opened in a new tab.
														 */}
														<Link
															className="font-medium text-foreground outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-accent"
															params={{ organizationId: organization.id }}
															to={DETAIL_ROUTE}
														>
															{organization.name}
														</Link>
													</TableCell>
													<TableCell className="text-muted-foreground">
														{organization.slug}
													</TableCell>
												</TableRow>
											))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			)}

			<Dialog onOpenChange={setCreateOpen} open={isCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create organization</DialogTitle>
						<DialogDescription>
							You become its owner, and it becomes your active organization.
						</DialogDescription>
					</DialogHeader>
					<CreateOrganizationForm
						onCancel={() => setCreateOpen(false)}
						onCreated={() => setCreateOpen(false)}
					/>
				</DialogContent>
			</Dialog>
		</ShellPage>
	);
}
