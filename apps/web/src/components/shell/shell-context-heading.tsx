import { cn } from "@brnit/ui/lib/utils";

type ShellContextHeadingProps = Readonly<{
	className?: string;
	size?: "md" | "sm";
	subtitle?: string;
	title: string;
}>;

const primaryTextClassName = {
	md: "truncate font-semibold text-brand-ink text-sm tracking-tight",
	sm: "truncate font-semibold text-brand-ink text-xs tracking-tight",
} as const;

/** "Where am I" for the top bar and sidebar. Never an `<h1>` — that is `ShellPageHeader`. */
export function ShellContextHeading({
	className,
	size = "md",
	subtitle,
	title,
}: ShellContextHeadingProps) {
	return (
		<div className={cn("min-w-0", className)}>
			<p className={primaryTextClassName[size]}>{title}</p>
			{subtitle ? (
				<p className="truncate text-brand-muted text-xs leading-snug">
					{subtitle}
				</p>
			) : null}
		</div>
	);
}
