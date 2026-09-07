import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { mealQueryOptions } from "@/lib/api/queries/meals";
import { parseDeleteFlagSearch } from "@/lib/delete-flag-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const MealDetailPage = lazyPage(
	() => import("@/pages/nutritionist/meal-detail-page"),
	"NutritionistMealDetailPage"
);

export const Route = createFileRoute("/dashboard/nutritionist/meals/$mealId")({
	component: MealDetailRoute,
	head: () => createStandardPageHead("Meal"),
	loader: ({ context, params }) => {
		context.queryClient.prefetchQuery(
			mealQueryOptions("nutritionist", params.mealId)
		);
	},
	// The list's delete action deep-links here with `?delete`, so the
	// confirmation survives a refresh and the back button closes it.
	validateSearch: parseDeleteFlagSearch,
});

function MealDetailRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<MealDetailPage />
		</Suspense>
	);
}
