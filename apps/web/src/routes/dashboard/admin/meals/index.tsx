import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { mealsQueryOptions } from "@/lib/api/queries/meals";
import { parseCatalogListSearch } from "@/lib/catalog-list-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const MealsPage = lazyPage(
	() => import("@/pages/admin/meals-page"),
	"MealsPage"
);

export const Route = createFileRoute("/dashboard/admin/meals/")({
	component: MealsRoute,
	head: () => createStandardPageHead("Meals"),
	// Declared before `loader` on purpose: TanStack infers the loader's `deps`
	// from this property, and the inference only lands if it is seen first.
	loaderDeps: ({ search }) => ({ search }),
	loader: ({ context, deps }) => {
		context.queryClient.prefetchQuery(mealsQueryOptions("admin", deps.search));
	},
	validateSearch: parseCatalogListSearch,
});

function MealsRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<MealsPage />
		</Suspense>
	);
}
