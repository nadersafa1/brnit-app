import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { lazyPage } from "@/lib/lazy-page";
import { createPageHead, SITE_TITLE } from "@/lib/page-head";

const LandingPage = lazyPage(
	() => import("@/pages/landing-page"),
	"LandingPage"
);

/**
 * The public landing page, and the gatekeeper the old `app/page.tsx` was: a
 * signed-in visitor is forwarded to the dashboard, or to `/complete-profile`
 * when their profile is still missing a date of birth.
 *
 * The session probe is best-effort. This is the one route a stranger reaches
 * first, and it must render when the API is unreachable — a marketing page that
 * 500s because the backend is down is worse than one that shows a signed-in
 * visitor the marketing copy for a second.
 */
export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const user = await authClient
			.getSession()
			.then((result) => result.data?.user)
			.catch(() => undefined);

		if (!user) {
			return;
		}

		throw redirect({ to: user.dob ? "/dashboard" : "/complete-profile" });
	},
	component: LandingRoute,
	head: () =>
		createPageHead({
			description:
				"Brnit runs your company's nutrition programme: nutritionist-built diet plans, daily logging and body-composition tracking, in English and Arabic.",
			robots: "index, follow",
			title: `${SITE_TITLE} — workplace wellbeing, measured`,
		}),
});

function LandingRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<LandingPage />
		</Suspense>
	);
}
