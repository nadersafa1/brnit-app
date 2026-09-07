import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@brnit/ui/components/select";
import { toast } from "sonner";

import { useSetActiveOrganizationMutation } from "@/hooks/use-organization-mutations";
import { authClient } from "@/lib/auth-client";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const SWITCH_FAILED_MESSAGE = "Could not switch organization";

/**
 * Picks the session's active organization.
 *
 * Everything on these screens is scoped to that one organization — server-side
 * from `session.activeOrganizationId`, and in the cache keys — so an app admin
 * who has not adopted one yet is offered this rather than an error.
 *
 * The switch goes through the organization area's own mutation so it invalidates
 * the resolved context exactly the way every other caller does; once that lands,
 * every scoped query re-keys off the new id and refetches on its own.
 */
export function OrganizationSelect() {
	const { data: organizations } = authClient.useListOrganizations();
	const { data: activeOrganization } = authClient.useActiveOrganization();
	const setActiveMutation = useSetActiveOrganizationMutation();

	if (!organizations?.length) {
		return null;
	}

	return (
		<Select
			disabled={setActiveMutation.isPending}
			onValueChange={(value: string | null) => {
				if (value === null) {
					return;
				}
				setActiveMutation.mutate(value, {
					onError: (error) => {
						toast.error(
							getUserFacingErrorMessage(error, SWITCH_FAILED_MESSAGE)
						);
					},
				});
			}}
			value={activeOrganization?.id ?? null}
		>
			<SelectTrigger
				aria-label="Active organization"
				className="w-full sm:w-64"
				size="sm"
			>
				<SelectValue placeholder="Select an organization" />
			</SelectTrigger>
			<SelectContent>
				{organizations.map((organization) => (
					<SelectItem key={organization.id} value={organization.id}>
						{organization.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
