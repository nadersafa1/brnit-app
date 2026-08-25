import { Link } from "@tanstack/react-router";
import { FlameIcon } from "lucide-react";

type ShellSidebarBrandProps = Readonly<{
	subtitle?: string;
}>;

export function ShellSidebarBrand({ subtitle }: ShellSidebarBrandProps) {
	return (
		<Link
			className="flex items-center gap-2.5 rounded-xl px-1 py-1 outline-offset-2 transition-opacity duration-(--default-transition-duration) hover:opacity-90 focus-visible:outline-2 focus-visible:outline-brand-accent"
			to="/dashboard"
		>
			{/* `bg-primary` is a fill; its only legal copy colour is `text-primary-foreground`. */}
			<span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
				<FlameIcon aria-hidden className="size-5" />
			</span>
			<span className="min-w-0">
				<span className="block truncate font-bold text-base tracking-tight">
					Brnit
				</span>
				<span className="block truncate text-brand-muted text-xs">
					{subtitle ?? "Healthy life challenges"}
				</span>
			</span>
		</Link>
	);
}
