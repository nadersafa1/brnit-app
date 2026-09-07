import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { foodCategoryQueryOptions } from "@/lib/api/queries/food-categories";
import { foodItemsQueryOptions } from "@/lib/api/queries/food-items";
import { parseFoodItemsSearch } from "@/lib/food-items-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const CategoryDetailPage = lazyPage(
	() => import("@/pages/nutritionist/category-detail-page"),
	"NutritionistCategoryDetailPage"
);

export const Route = createFileRoute(
	"/dashboard/nutritionist/categories/$foodCategoryId"
)({
	component: CategoryDetailRoute,
	head: () => createStandardPageHead("Food category"),
	loaderDeps: ({ search }) => ({ search }),
	loader: ({ context, deps, params }) => {
		const { queryClient } = context;
		queryClient.prefetchQuery(
			foodCategoryQueryOptions("nutritionist", params.foodCategoryId)
		);
		// The category's own food items, filtered by the path id rather than by
		// the `categoryId` search param the shared parser also understands.
		queryClient.prefetchQuery(
			foodItemsQueryOptions("nutritionist", {
				...deps.search,
				categoryId: params.foodCategoryId,
			})
		);
	},
	validateSearch: parseFoodItemsSearch,
});

function CategoryDetailRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<CategoryDetailPage />
		</Suspense>
	);
}
