import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { parseAuthSearch } from "@/lib/auth-search";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const LoginPage = lazyPage(() => import("@/pages/login-page"), "LoginPage");

export const Route = createFileRoute("/login")({
	component: LoginRoute,
	head: () => createStandardPageHead("Sign in"),
	validateSearch: parseAuthSearch,
});

function LoginRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<LoginPage />
		</Suspense>
	);
}
