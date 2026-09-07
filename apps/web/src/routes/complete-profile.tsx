import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { parseAuthSearch } from "@/lib/auth-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";
import { resolvePostAuthPath } from "@/lib/post-auth-redirect";
import { requireSession } from "@/lib/route-guards";

const CompleteProfilePage = lazyPage(
	() => import("@/pages/complete-profile-page"),
	"CompleteProfilePage"
);

export const Route = createFileRoute("/complete-profile")({
	// A signed-in user who already has a `dob` has nothing to do here — send them
	// on rather than showing a form that would be a no-op.
	beforeLoad: async ({ location, search }) => {
		const session = await requireSession(location.href);
		if (session.user.dob) {
			throw redirect({ href: resolvePostAuthPath(search.redirect) });
		}
	},
	component: CompleteProfileRoute,
	head: () => createStandardPageHead("Complete your profile"),
	validateSearch: parseAuthSearch,
});

function CompleteProfileRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<CompleteProfilePage />
		</Suspense>
	);
}
