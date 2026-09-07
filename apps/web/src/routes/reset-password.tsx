import {
	createFileRoute,
	type SearchSchemaInput,
} from "@tanstack/react-router";
import { Suspense } from "react";

import Loader from "@/components/loader";
import { lazyPage } from "@/lib/lazy-page";
import { createStandardPageHead } from "@/lib/page-head";

const ResetPasswordPage = lazyPage(
	() => import("@/pages/reset-password-page"),
	"ResetPasswordPage"
);

interface ResetPasswordSearch {
	/** Single-use token from the reset email. Absent means the link was mangled. */
	token?: string;
}

function parseResetPasswordSearch(
	search: Record<string, unknown> & SearchSchemaInput
): ResetPasswordSearch {
	return typeof search.token === "string" && search.token.length > 0
		? { token: search.token }
		: {};
}

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordRoute,
	head: () => createStandardPageHead("Set a new password"),
	validateSearch: parseResetPasswordSearch,
});

function ResetPasswordRoute() {
	return (
		<Suspense fallback={<Loader />}>
			<ResetPasswordPage />
		</Suspense>
	);
}
