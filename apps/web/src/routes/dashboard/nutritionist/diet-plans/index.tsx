import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { dietPlansQueryOptions } from "@/lib/api/queries/diet-plans";
import { parseCatalogListSearch } from "@/lib/catalog-list-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const DietPlansPage = lazyPage(
	() => import("@/pages/nutritionist/diet-plans-page"),
	"NutritionistDietPlansPage"
);

export const Route = createFileRoute("/dashboard/nutritionist/diet-plans/")({
	component: DietPlansRoute,
	head: () => createStandardPageHead("Diet plans"),
	loaderDeps: ({ search }) => ({ search }),
	loader: ({ context, deps }) => {
		context.queryClient.prefetchQuery(
			dietPlansQueryOptions("nutritionist", deps.search)
		);
	},
	validateSearch: parseCatalogListSearch,
});

function DietPlansRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<DietPlansPage />
		</Suspense>
	);
}
