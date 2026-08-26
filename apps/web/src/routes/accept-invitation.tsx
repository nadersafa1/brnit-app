import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { parseAuthSearch } from "@/lib/auth-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const AcceptInvitationPage = lazyPage(
	() => import("@/pages/accept-invitation-page"),
	"AcceptInvitationPage"
);

/**
 * Ungated on purpose: the visitor arrives from an email and may be signed out.
 * The page sends them through `/login` itself, carrying the invitation.
 */
export const Route = createFileRoute("/accept-invitation")({
	component: AcceptInvitationRoute,
	head: () => createStandardPageHead("Accept invitation"),
	validateSearch: parseAuthSearch,
});

function AcceptInvitationRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<AcceptInvitationPage />
		</Suspense>
	);
}
