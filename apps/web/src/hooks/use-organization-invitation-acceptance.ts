import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { invalidateOrganizationQueries } from "@/lib/api/queries/organization-invalidation";
import {
	acceptOrganizationInvitation,
	setActiveOrganization,
} from "@/lib/api/queries/organizations";
import { authClient } from "@/lib/auth-client";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const ACCEPT_INVITATION_PATH = "/accept-invitation";
const ROUTE_ID = "/accept-invitation";

/**
 * `pending` covers both "resolving the session" and "accepting" — neither has a
 * decision for the visitor to make, so both render the same spinner.
 */
export type InvitationAcceptanceStatus =
	| "accepted"
	| "error"
	| "invalid"
	| "pending";

/**
 * The whole `/accept-invitation` screen: it has no form, only an outcome.
 *
 * The invitation email links straight here, so the visitor may well be signed
 * out. In that case they are sent to `/login` carrying **both** where to come
 * back to and the invitation id, which is what lets `useLoginForm` resume the
 * acceptance instead of dropping them on the dashboard.
 *
 * Acceptance runs at most once without an explicit retry (the ref is set before
 * the call, not after it) because `acceptInvitation` is not idempotent: a
 * second automatic call would find the invitation already accepted and report a
 * failure for something that worked.
 */
export function useOrganizationInvitationAcceptance() {
	const navigate = useNavigate();
	const search = useSearch({ from: ROUTE_ID });
	const queryClient = useQueryClient();
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();

	const [status, setStatus] = useState<InvitationAcceptanceStatus>("pending");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const hasStarted = useRef(false);

	const invitationId = search.invitationId ?? null;

	const accept = useCallback(
		async (id: string) => {
			setStatus("pending");
			setErrorMessage(null);
			try {
				const { organizationId } = await acceptOrganizationInvitation(id);
				// Best effort: the membership already exists, and the context read
				// auto-adopts a sole membership even if this call is refused.
				await setActiveOrganization(organizationId).catch(() => undefined);
				await invalidateOrganizationQueries(queryClient, organizationId);
				toast.success("You joined the organization");
				setStatus("accepted");
				navigate({ replace: true, to: "/dashboard" });
			} catch (error) {
				const message = getUserFacingErrorMessage(
					error,
					"Could not accept the invitation"
				);
				toast.error(message);
				setErrorMessage(message);
				setStatus("error");
			}
		},
		[navigate, queryClient]
	);

	useEffect(() => {
		if (invitationId === null) {
			setStatus("invalid");
			return;
		}
		if (isSessionPending || hasStarted.current) {
			return;
		}
		if (!session?.user) {
			navigate({
				replace: true,
				search: { invitationId, redirect: ACCEPT_INVITATION_PATH },
				to: "/login",
			});
			return;
		}
		hasStarted.current = true;
		accept(invitationId);
	}, [accept, invitationId, isSessionPending, navigate, session?.user]);

	const retry = useCallback(() => {
		if (invitationId !== null) {
			accept(invitationId);
		}
	}, [accept, invitationId]);

	return { errorMessage, retry, status };
}
