import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { mealsQueryOptions } from "@/lib/api/queries/meals";
import { parseCatalogListSearch } from "@/lib/catalog-list-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const MealsPage = lazyPage(
	() => import("@/pages/nutritionist/meals-page"),
	"NutritionistMealsPage"
);

export const Route = createFileRoute("/dashboard/nutritionist/meals/")({
	component: MealsRoute,
	head: () => createStandardPageHead("Meals"),
	loaderDeps: ({ search }) => ({ search }),
	loader: ({ context, deps }) => {
		context.queryClient.prefetchQuery(
			mealsQueryOptions("nutritionist", deps.search)
		);
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
