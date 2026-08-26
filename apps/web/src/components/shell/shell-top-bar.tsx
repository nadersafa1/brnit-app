import { cn } from "@brnit/ui/lib/utils";

import { ModeToggle } from "@/components/mode-toggle";
import { ShellContextHeading } from "@/components/shell/shell-context-heading";
import { UserMenu } from "@/components/shell/user-menu";

interface ShellTopBarProps {
	className?: string;
	subtitle?: string;
	title: string;
}

const shellTopBarFrameClassName =
	"flex items-center justify-between gap-3 border-brand-border border-b bg-background/95 px-3 py-2.5 backdrop-blur-md sm:px-4";

export const shellTopBarActionsClassName =
	"flex shrink-0 items-center gap-1 border-brand-border border-s ps-2 sm:gap-2 sm:ps-3";

/** Theme switch and account menu — the actions are identical on desktop and mobile. */
export function ShellTopBarActions() {
	return (
		<>
			<ModeToggle />
			<UserMenu />
		</>
	);
}

export function ShellTopBar({
	className,
	subtitle,
	title,
}: Readonly<ShellTopBarProps>) {
	return (
		<div className={cn(shellTopBarFrameClassName, className)}>
			<ShellContextHeading subtitle={subtitle} title={title} />
			<div className={shellTopBarActionsClassName}>
				<ShellTopBarActions />
			</div>
		</div>
	);
}
