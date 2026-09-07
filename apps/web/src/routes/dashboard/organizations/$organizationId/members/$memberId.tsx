import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { organizationMembersQueryOptions } from "@/lib/api/queries/organizations";
import { canAccessNutritionistSection } from "@/lib/authorization/dashboard-access";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";
import { assertSectionAccess } from "@/lib/route-guards";

const OrganizationMemberDetailPage = lazyPage(
	() => import("@/pages/organizations/organization-member-detail-page"),
	"OrganizationMemberDetailPage"
);

/**
 * Was the `DashboardSegmentGate` the pre-overhaul screen rendered inline: every
 * read on this page goes through the nutritionist guards, so the gate belongs
 * in `beforeLoad` rather than in the component.
 */
export const Route = createFileRoute(
	"/dashboard/organizations/$organizationId/members/$memberId"
)({
	beforeLoad: ({ context }) => {
		assertSectionAccess(context, canAccessNutritionistSection);
	},
	component: OrganizationMemberDetailRoute,
	head: () => createStandardPageHead("Member"),
	// The assignment and assessment reads wait on `setActive`, so only the
	// roster — which names its organization explicitly — is worth prefetching.
	loader: ({ context, params }) => {
		context.queryClient.prefetchQuery(
			organizationMembersQueryOptions(params.organizationId)
		);
	},
});

function OrganizationMemberDetailRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<OrganizationMemberDetailPage />
		</Suspense>
	);
}
