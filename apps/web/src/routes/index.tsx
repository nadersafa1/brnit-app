import { Button } from "@brnit/ui/components/button";
import { Card, CardContent } from "@brnit/ui/components/card";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { FlameIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { createPageHead, SITE_TITLE } from "@/lib/page-head";

/**
 * The public landing page, and the gatekeeper the old `app/page.tsx` was: a
 * signed-in visitor is forwarded to the dashboard, or to `/complete-profile`
 * when their profile is still missing a date of birth.
 */
export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const { data } = await authClient.getSession();
		if (!data?.user) {
			return;
		}
		throw redirect({ to: data.user.dob ? "/dashboard" : "/complete-profile" });
	},
	component: LandingRoute,
	head: () =>
		createPageHead({
			description:
				"Challenge yourself with your group. Diet and exercise tailored for a healthier life.",
			title: SITE_TITLE,
		}),
});

function LandingRoute() {
	return (
		<div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-8 bg-background p-6 md:p-10">
			<div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
				<span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
					<FlameIcon aria-hidden className="size-6" />
				</span>
				<div className="space-y-2">
					<h1 className="font-bold text-3xl tracking-tight">Brnit</h1>
					<p className="text-muted-foreground">
						Challenge yourself with your group. Diet and exercise tailored for a
						healthier life.
					</p>
				</div>
				<Card className="w-full">
					<CardContent className="flex flex-col gap-3 p-6">
						<Button render={<Link search={{}} to="/login" />}>Log in</Button>
						<Button render={<Link to="/signup" />} variant="outline">
							Sign up
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
