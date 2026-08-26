import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { foodItemQueryOptions } from "@/lib/api/queries/food-items";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const FoodItemDetailPage = lazyPage(
	() => import("@/pages/nutritionist/food-item-detail-page"),
	"NutritionistFoodItemDetailPage"
);

export const Route = createFileRoute(
	"/dashboard/nutritionist/food-items/$foodItemId"
)({
	component: FoodItemDetailRoute,
	head: () => createStandardPageHead("Food item"),
	loader: ({ context, params }) => {
		context.queryClient.prefetchQuery(
			foodItemQueryOptions("nutritionist", params.foodItemId)
		);
	},
});

function FoodItemDetailRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<FoodItemDetailPage />
		</Suspense>
	);
}
