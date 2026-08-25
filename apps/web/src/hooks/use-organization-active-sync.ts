import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useSetActiveOrganizationMutation } from "@/hooks/use-organization-mutations";
import { organizationContextQueryOptions } from "@/lib/api/queries/organization-context";

/**
 * Makes the organization being viewed the session's **active** one.
 *
 * The assignment and assessment endpoints resolve their scope from
 * `session.activeOrganizationId` and ignore any organization id in the request,
 * so opening `/dashboard/organizations/:id` has to move the session before
 * those reads can return this organization's rows.
 *
 * One attempt per organization id: the ref is set *before* the call and never
 * cleared on failure, because a rejected `setActive` means the viewer is not a
 * member — retrying would spin. The screen's own membership check is what tells
 * them so.
 */
export function useOrganizationActiveSync(organizationId: string): {
	activeOrgId: string | null;
	isActive: boolean;
} {
	const { data: organizationContext } = useQuery(
		organizationContextQueryOptions()
	);
	const setActiveMutation = useSetActiveOrganizationMutation();
	const requestedOrganizationId = useRef<string | null>(null);

	const activeOrgId = organizationContext?.activeOrgId ?? null;
	const isActive = activeOrgId === organizationId;
	const { mutate } = setActiveMutation;

	useEffect(() => {
		if (organizationId.length === 0 || isActive) {
			return;
		}
		if (requestedOrganizationId.current === organizationId) {
			return;
		}
		requestedOrganizationId.current = organizationId;
		mutate(organizationId);
	}, [isActive, mutate, organizationId]);

	return { activeOrgId, isActive };
}
