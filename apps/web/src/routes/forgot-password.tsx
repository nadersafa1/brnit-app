import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const ForgotPasswordPage = lazyPage(
	() => import("@/pages/forgot-password-page"),
	"ForgotPasswordPage"
);

export const Route = createFileRoute("/forgot-password")({
	component: ForgotPasswordRoute,
	head: () => createStandardPageHead("Forgot your password"),
});

function ForgotPasswordRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<ForgotPasswordPage />
		</Suspense>
	);
}
