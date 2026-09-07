import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { foodCategoriesQueryOptions } from "@/lib/api/queries/food-categories";
import { parseCatalogListSearch } from "@/lib/catalog-list-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const CategoriesPage = lazyPage(
	() => import("@/pages/nutritionist/categories-page"),
	"NutritionistCategoriesPage"
);

export const Route = createFileRoute("/dashboard/nutritionist/categories/")({
	component: CategoriesRoute,
	head: () => createStandardPageHead("Food categories"),
	// Declared before `loader` on purpose: TanStack infers the loader's `deps`
	// from this property, and the inference only lands if it is seen first.
	loaderDeps: ({ search }) => ({ search }),
	loader: ({ context, deps }) => {
		context.queryClient.prefetchQuery(
			foodCategoriesQueryOptions("nutritionist", deps.search)
		);
	},
	validateSearch: parseCatalogListSearch,
});

function CategoriesRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<CategoriesPage />
		</Suspense>
	);
}
