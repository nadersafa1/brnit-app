import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import {
	organizationMembersQueryOptions,
	organizationsQueryOptions,
} from "@/lib/api/queries/organizations";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const OrganizationDetailPage = lazyPage(
	() => import("@/pages/organizations/organization-detail-page"),
	"OrganizationDetailPage"
);

export const Route = createFileRoute(
	"/dashboard/organizations/$organizationId/"
)({
	component: OrganizationDetailRoute,
	head: () => createStandardPageHead("Organization"),
	// The roster does not depend on the session's active organization, so it can
	// start downloading before the page chunk lands.
	loader: ({ context, params }) => {
		context.queryClient.prefetchQuery(organizationsQueryOptions());
		context.queryClient.prefetchQuery(
			organizationMembersQueryOptions(params.organizationId)
		);
	},
});

function OrganizationDetailRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<OrganizationDetailPage />
		</Suspense>
	);
}
