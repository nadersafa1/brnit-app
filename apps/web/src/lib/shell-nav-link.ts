import { cn } from "@brnit/ui/lib/utils";

const shellNavLinkBaseClassName =
	"flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 font-medium text-sm outline-offset-2 transition-colors duration-(--default-transition-duration) ease-standard focus-visible:outline-2 focus-visible:outline-brand-accent";

/**
 * Active state is a soft accent wash plus readable accent copy — never the
 * accent fill, which is 2.42:1 against the app surface and unreadable as text.
 */
export function shellNavLinkClassName(active: boolean): string {
	return cn(
		shellNavLinkBaseClassName,
		active
			? "bg-brand-accent-soft text-brand-accent-fg"
			: "text-brand-muted hover:bg-brand-overlay-soft hover:text-brand-ink"
	);
}

export function shellNavLinkIconClassName(active: boolean): string {
	return cn(
		"size-4 shrink-0 transition-colors duration-(--default-transition-duration)",
		active ? "text-brand-accent-fg" : "text-brand-muted opacity-80"
	);
}
