import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { organizationMembersQueryOptions } from "@/hooks/use-assessment-members";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const MembersPage = lazyPage(
	() => import("@/pages/direct-admin/members-page"),
	"MembersPage"
);

export const Route = createFileRoute("/dashboard/direct-admin/members/")({
	component: MembersRoute,
	head: () => createStandardPageHead("Members"),
	// Starts the roster request while the page chunk downloads. An app admin who
	// has adopted no organization has nothing to prefetch yet.
	loader: ({ context }) => {
		const activeOrgId = context.organizationContext.activeOrgId;
		if (activeOrgId) {
			context.queryClient.prefetchQuery(
				organizationMembersQueryOptions(activeOrgId)
			);
		}
	},
});

function MembersRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<MembersPage />
		</Suspense>
	);
}
