import { Button } from "@brnit/ui/components/button";
import { Link } from "@tanstack/react-router";

import { AuthFormError } from "@/components/auth/auth-form-error";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import Loader from "@/components/loader";
import { useOrganizationInvitationAcceptance } from "@/hooks/use-organization-invitation-acceptance";

const DASHBOARD_PATH = "/dashboard";

function DashboardLink() {
	return (
		<Button className="w-full" render={<Link to={DASHBOARD_PATH} />}>
			Go to the dashboard
		</Button>
	);
}

/**
 * Accepts an invitation and gets out of the way.
 *
 * There is nothing to fill in: the link carries the invitation, so the screen
 * is three outcomes — a spinner while it works, an explanation when the link is
 * unusable, and the server's own reason when acceptance is refused (expired,
 * already accepted, addressed to a different email).
 */
export function AcceptInvitationPage() {
	const { errorMessage, retry, status } = useOrganizationInvitationAcceptance();

	if (status === "invalid") {
		return (
			<AuthPageShell
				description="This page needs an invitation id. Open the link from your invitation email."
				title="Invalid invitation link"
			>
				<div className="mt-8">
					<DashboardLink />
				</div>
			</AuthPageShell>
		);
	}

	if (status === "error") {
		return (
			<AuthPageShell
				description="The invitation could not be accepted."
				title="Something went wrong"
			>
				<div className="mt-8 space-y-4">
					{errorMessage ? <AuthFormError message={errorMessage} /> : null}
					<Button className="w-full" onClick={retry} variant="outline">
						Try again
					</Button>
					<DashboardLink />
				</div>
			</AuthPageShell>
		);
	}

	return (
		<div className="flex min-h-svh items-center justify-center bg-background p-6">
			<Loader />
		</div>
	);
}
