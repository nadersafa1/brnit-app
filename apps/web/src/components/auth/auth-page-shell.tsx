import { Card, CardContent } from "@brnit/ui/components/card";
import { FlameIcon } from "lucide-react";
import type { ReactNode } from "react";

interface AuthPageShellProps {
	children: ReactNode;
	description?: string;
	title: string;
}

/**
 * The frame every signed-out screen sits in. Owns its own padding because it is
 * outside `AppSidebarShell` — these routes have no sidebar and no top bar.
 */
export function AuthPageShell({
	children,
	description,
	title,
}: Readonly<AuthPageShellProps>) {
	return (
		<div className="flex min-h-svh flex-1 flex-col items-center justify-center bg-background p-6 md:p-10">
			<Card className="w-full max-w-sm">
				<CardContent className="p-6 sm:p-8">
					<div className="flex flex-col items-center gap-3 text-center">
						<span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
							<FlameIcon aria-hidden className="size-5" />
						</span>
						<h1 className="font-bold text-2xl tracking-tight">{title}</h1>
						{description ? (
							<p className="text-muted-foreground text-sm">{description}</p>
						) : null}
					</div>
					{children}
				</CardContent>
			</Card>
		</div>
	);
}
