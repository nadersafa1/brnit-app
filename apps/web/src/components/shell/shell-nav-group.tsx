import { cn } from "@brnit/ui/lib/utils";
import type { ReactNode } from "react";

interface ShellNavGroupProps {
	children: ReactNode;
	id: string;
	isFirst?: boolean;
	label: string;
}

/**
 * A labelled band of nav links. A real `<section aria-labelledby>` rather than
 * a styled `<div>`, so the group name is announced before its links.
 */
export function ShellNavGroup({
	children,
	id,
	isFirst = false,
	label,
}: Readonly<ShellNavGroupProps>) {
	return (
		<section
			aria-labelledby={id}
			className={cn("flex flex-col gap-0.5", isFirst ? "mt-0" : "mt-5")}
		>
			<p
				className="flex items-center gap-2 px-3 pb-1.5 font-semibold text-[11px] text-brand-subtle uppercase tracking-wider"
				id={id}
			>
				<span aria-hidden className="h-px w-2 bg-brand-accent/60" />
				{label}
			</p>
			{children}
		</section>
	);
}
