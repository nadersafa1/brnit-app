import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { organizationsQueryOptions } from "@/lib/api/queries/organizations";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const OrganizationsPage = lazyPage(
	() => import("@/pages/organizations/organizations-page"),
	"OrganizationsPage"
);

export const Route = createFileRoute("/dashboard/organizations/")({
	component: OrganizationsRoute,
	head: () => createStandardPageHead("Organizations"),
	// Starts the list request while the page chunk is still downloading, so the
	// two happen in parallel instead of one after the other.
	loader: ({ context }) => {
		context.queryClient.prefetchQuery(organizationsQueryOptions());
	},
});

function OrganizationsRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<OrganizationsPage />
		</Suspense>
	);
}
