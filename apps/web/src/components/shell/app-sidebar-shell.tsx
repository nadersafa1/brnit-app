import { buttonVariants } from "@brnit/ui/components/button";
import { ScrollArea } from "@brnit/ui/components/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "@brnit/ui/components/sheet";
import { MenuIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { ShellContextHeading } from "@/components/shell/shell-context-heading";
import { ShellSidebarBrand } from "@/components/shell/shell-sidebar-brand";
import {
	ShellTopBar,
	ShellTopBarActions,
	shellTopBarActionsClassName,
} from "@/components/shell/shell-top-bar";

interface AppSidebarShellProps {
	/** Names the `<nav>` landmark. */
	ariaLabel: string;
	children: ReactNode;
	/** Target of the skip link; also the `<main>` id. Unique per shell. */
	mainId: string;
	navLinks: (props: { onNavigate?: () => void }) => ReactNode;
	sidebarSubtitle?: string;
	topBarSubtitle?: string;
	topBarTitle: string;
}

type SidebarNavPanelProps = Readonly<{
	ariaLabel: string;
	navLinks: (props: { onNavigate?: () => void }) => ReactNode;
	onNavigate?: () => void;
	sidebarSubtitle?: string;
}>;

/** The same panel serves the desktop rail and the mobile sheet. */
function SidebarNavPanel({
	ariaLabel,
	navLinks,
	onNavigate,
	sidebarSubtitle,
}: SidebarNavPanelProps) {
	return (
		<>
			<div className="shrink-0 border-brand-border border-b p-3">
				<ShellSidebarBrand subtitle={sidebarSubtitle} />
			</div>
			<ScrollArea className="min-h-0 flex-1">
				<nav aria-label={ariaLabel} className="flex flex-col gap-0.5 p-2">
					{navLinks({ onNavigate })}
				</nav>
			</ScrollArea>
		</>
	);
}

/**
 * The dashboard chrome: sidebar, top bar, and the `<main>` every screen renders
 * into.
 *
 * **This component owns the layout padding** (`p-4 md:p-6` on `<main>`). Pages
 * compose `ShellPage` inside it and never repeat a gutter — duplicated padding
 * is the single most common drift in a shell like this and it only shows up at
 * one breakpoint.
 */
export function AppSidebarShell({
	ariaLabel,
	children,
	mainId,
	navLinks,
	sidebarSubtitle,
	topBarSubtitle,
	topBarTitle,
}: Readonly<AppSidebarShellProps>) {
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<a
				className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-background focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
				href={`#${mainId}`}
			>
				Skip to main content
			</a>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
				<aside className="hidden min-h-0 w-64 shrink-0 flex-col border-brand-border border-e bg-brand-card/60 md:flex">
					<SidebarNavPanel
						ariaLabel={ariaLabel}
						navLinks={navLinks}
						sidebarSubtitle={sidebarSubtitle}
					/>
				</aside>

				<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
					<ShellTopBar
						className="hidden shrink-0 md:flex"
						subtitle={topBarSubtitle}
						title={topBarTitle}
					/>
					<header className="flex shrink-0 items-center gap-2 border-brand-border border-b bg-background/95 px-3 py-2 backdrop-blur-md md:hidden">
						<Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
							<SheetTrigger
								className={buttonVariants({
									size: "icon-sm",
									variant: "outline",
								})}
							>
								<MenuIcon className="size-4" />
								<span className="sr-only">Open navigation</span>
							</SheetTrigger>
							<SheetContent
								className="flex w-[min(100%,20rem)] flex-col gap-0 bg-brand-app p-0"
								side="left"
							>
								<SheetTitle className="sr-only">{topBarTitle}</SheetTitle>
								<SidebarNavPanel
									ariaLabel={ariaLabel}
									navLinks={navLinks}
									onNavigate={() => setMobileOpen(false)}
									sidebarSubtitle={sidebarSubtitle}
								/>
							</SheetContent>
						</Sheet>
						<ShellContextHeading
							className="flex-1"
							size="sm"
							subtitle={topBarSubtitle}
							title={topBarTitle}
						/>
						<div className={shellTopBarActionsClassName}>
							<ShellTopBarActions />
						</div>
					</header>

					<main className="min-h-0 flex-1 overflow-auto p-4 md:p-6" id={mainId}>
						{children}
					</main>
				</div>
			</div>
		</div>
	);
}
