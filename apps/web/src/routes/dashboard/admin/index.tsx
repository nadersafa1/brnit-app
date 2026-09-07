import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { parseAdminUsersSearch } from "@/lib/admin-users-search";
import { adminUsersQueryOptions } from "@/lib/api/queries/admin-users";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const AdminUsersPage = lazyPage(
	() => import("@/pages/admin/admin-users-page"),
	"AdminUsersPage"
);

export const Route = createFileRoute("/dashboard/admin/")({
	component: AdminUsersRoute,
	head: () => createStandardPageHead("Users"),
	// Declared before `loader` on purpose: TanStack infers the loader's `deps`
	// from this property, and the inference only lands if it is seen first.
	loaderDeps: ({ search }) => ({ search }),
	loader: ({ context, deps }) => {
		context.queryClient.prefetchQuery(adminUsersQueryOptions(deps.search));
	},
	validateSearch: parseAdminUsersSearch,
});

function AdminUsersRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<AdminUsersPage />
		</Suspense>
	);
}
