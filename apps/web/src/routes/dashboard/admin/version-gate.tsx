import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { adminVersionGateQueryOptions } from "@/lib/api/queries/version-gate";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const AdminVersionGatePage = lazyPage(
	() => import("@/pages/admin/version-gate-page"),
	"AdminVersionGatePage"
);

export const Route = createFileRoute("/dashboard/admin/version-gate")({
	component: AdminVersionGateRoute,
	head: () => createStandardPageHead("App version gate"),
	loader: ({ context }) => {
		context.queryClient.prefetchQuery(adminVersionGateQueryOptions());
	},
});

function AdminVersionGateRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<AdminVersionGatePage />
		</Suspense>
	);
}
