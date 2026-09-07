import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { dietPlansQueryOptions } from "@/lib/api/queries/diet-plans";
import { parseCatalogListSearch } from "@/lib/catalog-list-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const DietPlansPage = lazyPage(
	() => import("@/pages/admin/diet-plans-page"),
	"DietPlansPage"
);

export const Route = createFileRoute("/dashboard/admin/diet-plans/")({
	component: DietPlansRoute,
	head: () => createStandardPageHead("Diet plans"),
	// Declared before `loader` on purpose: TanStack infers the loader's `deps`
	// from this property, and the inference only lands if it is seen first.
	loaderDeps: ({ search }) => ({ search }),
	loader: ({ context, deps }) => {
		context.queryClient.prefetchQuery(
			dietPlansQueryOptions("admin", deps.search)
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
