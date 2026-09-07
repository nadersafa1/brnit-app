import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { foodCategoryQueryOptions } from "@/lib/api/queries/food-categories";
import { foodItemsQueryOptions } from "@/lib/api/queries/food-items";
import { parseFoodCategoryDetailSearch } from "@/lib/food-category-detail-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const FoodCategoryDetailPage = lazyPage(
	() => import("@/pages/admin/food-category-detail-page"),
	"FoodCategoryDetailPage"
);

export const Route = createFileRoute(
	"/dashboard/admin/categories/$foodCategoryId"
)({
	component: FoodCategoryDetailRoute,
	head: () => createStandardPageHead("Food category"),
	loaderDeps: ({ search }) => ({ search }),
	loader: ({ context, deps, params }) => {
		const { queryClient } = context;
		queryClient.prefetchQuery(
			foodCategoryQueryOptions("admin", params.foodCategoryId)
		);
		// The category's own items: filtered by the path id, not by the
		// `categoryId` search param the shared parser also understands.
		queryClient.prefetchQuery(
			foodItemsQueryOptions("admin", {
				...deps.search,
				categoryId: params.foodCategoryId,
			})
		);
	},
	// The list's delete action deep-links here with `?delete`.
	validateSearch: parseFoodCategoryDetailSearch,
});

function FoodCategoryDetailRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<FoodCategoryDetailPage />
		</Suspense>
	);
}
