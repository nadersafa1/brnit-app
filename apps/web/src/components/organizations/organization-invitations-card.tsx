import { Badge } from "@brnit/ui/components/badge";
import { Button } from "@brnit/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@brnit/ui/components/card";
import { Skeleton } from "@brnit/ui/components/skeleton";
import { PlusIcon } from "lucide-react";

import {
	formatInvitationStatus,
	formatOrganizationRole,
} from "@/components/organizations/organization-role-labels";
import { useCancelOrganizationInvitationMutation } from "@/hooks/use-organization-mutations";
import type { Invitation } from "@/lib/auth-client";

const SKELETON_ROWS = 2;
const PENDING_STATUS = "pending";

interface OrganizationInvitationsCardProps {
	invitations: readonly Invitation[];
	isPending: boolean;
	onInvite: () => void;
	organizationId: string;
}

/**
 * Outstanding invitations, with the one action they support.
 *
 * Only a `pending` invitation can be cancelled — an accepted or expired one is
 * a historical record, and better-auth refuses to cancel it — so the button is
 * conditional rather than being offered and then failing.
 */
export function OrganizationInvitationsCard({
	invitations,
	isPending,
	onInvite,
	organizationId,
}: Readonly<OrganizationInvitationsCardProps>) {
	const cancelMutation =
		useCancelOrganizationInvitationMutation(organizationId);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Invitations</CardTitle>
				<CardAction>
					<Button onClick={onInvite} size="sm">
						<PlusIcon aria-hidden />
						Invite member
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				{isPending ? (
					<div className="space-y-2">
						{Array.from({ length: SKELETON_ROWS }, (_, index) => (
							<Skeleton
								className="h-12 w-full"
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows have no identity
								key={`invitation-skeleton-${index}`}
							/>
						))}
					</div>
				) : null}

				{!isPending && invitations.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No invitations yet. Invited people join with the role you pick.
					</p>
				) : null}

				{!isPending && invitations.length > 0 ? (
					<ul className="space-y-2">
						{invitations.map((invitation) => (
							<li
								className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card-alt px-3 py-2.5"
								key={invitation.id}
							>
								<span className="min-w-0 text-sm">
									<span className="font-medium">{invitation.email}</span>
									<span className="text-muted-foreground">
										{" · "}
										{formatOrganizationRole(invitation.role)}
									</span>
								</span>
								<span className="flex items-center gap-2">
									<Badge variant="secondary">
										{formatInvitationStatus(invitation.status)}
									</Badge>
									{invitation.status === PENDING_STATUS ? (
										<Button
											disabled={cancelMutation.isPending}
											onClick={() => cancelMutation.mutate(invitation.id)}
											size="sm"
											variant="ghost"
										>
											Cancel
										</Button>
									) : null}
								</span>
							</li>
						))}
					</ul>
				) : null}
			</CardContent>
		</Card>
	);
}
