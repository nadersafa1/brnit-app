import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { organizationMembersQueryOptions } from "@/hooks/use-assessment-members";
import { memberAssessmentsQueryOptions } from "@/lib/api/queries/assessments";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const MemberAssessmentsPage = lazyPage(
	() => import("@/pages/direct-admin/member-assessments-page"),
	"MemberAssessmentsPage"
);

export const Route = createFileRoute(
	"/dashboard/direct-admin/members/$memberId"
)({
	component: MemberAssessmentsRoute,
	head: () => createStandardPageHead("Member assessments"),
	loader: ({ context, params }) => {
		const activeOrgId = context.organizationContext.activeOrgId;
		if (activeOrgId) {
			// The roster names the member; the list is their history.
			context.queryClient.prefetchQuery(
				organizationMembersQueryOptions(activeOrgId)
			);
			context.queryClient.prefetchQuery(
				memberAssessmentsQueryOptions(
					"direct-admin",
					activeOrgId,
					params.memberId
				)
			);
		}
	},
});

function MemberAssessmentsRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<MemberAssessmentsPage />
		</Suspense>
	);
}
