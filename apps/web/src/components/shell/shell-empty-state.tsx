import { Card, CardContent } from "@brnit/ui/components/card";
import { cn } from "@brnit/ui/lib/utils";
import { InboxIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ShellEmptyStateProps {
	action?: ReactNode;
	className?: string;
	description?: string;
	icon?: LucideIcon;
	title: string;
}

/**
 * "Nothing here yet" for a list, a filter that matched nothing, or a section
 * with no selection. One component so every empty surface reads the same:
 * an icon in a ring, a title, a sentence, and at most one action.
 */
export function ShellEmptyState({
	action,
	className,
	description,
	icon: Icon = InboxIcon,
	title,
}: Readonly<ShellEmptyStateProps>) {
	return (
		<Card
			className={cn("border-brand-border", className)}
			data-slot="shell-empty-state"
		>
			<CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
				<span className="flex size-12 items-center justify-center rounded-full bg-accent-soft">
					<Icon aria-hidden className="size-5 text-accent-fg" />
				</span>
				<p className="font-semibold text-base">{title}</p>
				{description ? (
					<p className="max-w-md text-muted-foreground text-sm">
						{description}
					</p>
				) : null}
				{action ? <div className="mt-1">{action}</div> : null}
			</CardContent>
		</Card>
	);
}
