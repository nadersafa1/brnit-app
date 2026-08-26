import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { foodItemsQueryOptions } from "@/lib/api/queries/food-items";
import { parseFoodItemsSearch } from "@/lib/food-items-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const FoodItemsPage = lazyPage(
	() => import("@/pages/admin/food-items-page"),
	"FoodItemsPage"
);

export const Route = createFileRoute("/dashboard/admin/food-items/")({
	component: FoodItemsRoute,
	head: () => createStandardPageHead("Food items"),
	// Declared before `loader` on purpose: TanStack infers the loader's `deps`
	// from this property, and the inference only lands if it is seen first.
	loaderDeps: ({ search }) => ({ search }),
	// Starts the list request while the page chunk is still downloading, so the
	// two happen in parallel instead of one after the other.
	loader: ({ context, deps }) => {
		context.queryClient.prefetchQuery(
			foodItemsQueryOptions("admin", deps.search)
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
