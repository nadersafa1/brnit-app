import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { dietPlanQueryOptions } from "@/lib/api/queries/diet-plans";
import { parseDeleteFlagSearch } from "@/lib/delete-flag-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const DietPlanDetailPage = lazyPage(
	() => import("@/pages/admin/diet-plan-detail-page"),
	"DietPlanDetailPage"
);

export const Route = createFileRoute("/dashboard/admin/diet-plans/$dietPlanId")(
	{
		component: DietPlanDetailRoute,
		head: () => createStandardPageHead("Diet plan"),
		loader: ({ context, params }) => {
			context.queryClient.prefetchQuery(
				dietPlanQueryOptions("admin", params.dietPlanId)
			);
		},
		// The list's delete action deep-links here with `?delete`.
		validateSearch: parseDeleteFlagSearch,
	}
);

function DietPlanDetailRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<DietPlanDetailPage />
		</Suspense>
	);
}
