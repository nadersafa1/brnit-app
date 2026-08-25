import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { foodItemsQueryOptions } from "@/lib/api/queries/food-items";
import { parseFoodItemsSearch } from "@/lib/food-items-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const FoodItemsPage = lazyPage(
	() => import("@/pages/nutritionist/food-items-page"),
	"NutritionistFoodItemsPage"
);

export const Route = createFileRoute("/dashboard/nutritionist/food-items/")({
	component: FoodItemsRoute,
	head: () => createStandardPageHead("Food items"),
	loaderDeps: ({ search }) => ({ search }),
	loader: ({ context, deps }) => {
		context.queryClient.prefetchQuery(
			foodItemsQueryOptions("nutritionist", deps.search)
		);
	},
	validateSearch: parseFoodItemsSearch,
});

function FoodItemsRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<FoodItemsPage />
		</Suspense>
	);
}
