import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const DashboardPage = lazyPage(
	() => import("@/pages/dashboard-page"),
	"DashboardPage"
);

export const Route = createFileRoute("/dashboard/")({
	component: DashboardRoute,
	head: () => createStandardPageHead("Dashboard"),
});

function DashboardRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<DashboardPage />
		</Suspense>
	);
}
