import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { foodItemQueryOptions } from "@/lib/api/queries/food-items";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const FoodItemDetailPage = lazyPage(
	() => import("@/pages/admin/food-item-detail-page"),
	"FoodItemDetailPage"
);

export const Route = createFileRoute("/dashboard/admin/food-items/$foodItemId")(
	{
		component: FoodItemDetailRoute,
		head: () => createStandardPageHead("Food item"),
		loader: ({ context, params }) => {
			context.queryClient.prefetchQuery(
				foodItemQueryOptions("admin", params.foodItemId)
			);
		},
	}
);

function FoodItemDetailRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<FoodItemDetailPage />
		</Suspense>
	);
}
