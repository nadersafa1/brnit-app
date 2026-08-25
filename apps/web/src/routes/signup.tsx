import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { parseAuthSearch } from "@/lib/auth-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const SignupPage = lazyPage(() => import("@/pages/signup-page"), "SignupPage");

export const Route = createFileRoute("/signup")({
	component: SignupRoute,
	head: () => createStandardPageHead("Create your account"),
	validateSearch: parseAuthSearch,
});

function SignupRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<SignupPage />
		</Suspense>
	);
}
