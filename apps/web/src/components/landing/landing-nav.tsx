import { Button, buttonVariants } from "@brnit/ui/components/button";
import { cn } from "@brnit/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { FlameIcon, MenuIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { ModeToggle } from "@/components/mode-toggle";
import { useScrolledPast } from "@/hooks/use-scroll-motion";
import { useI18n } from "@/lib/i18n/i18n-provider";

import { LandingContainer } from "./landing-section";
import { LanguageSwitcher } from "./language-switcher";

/** Section anchors, in the order they appear down the page. */
export const SECTION_IDS = {
	demo: "demo",
	faq: "faq",
	how: "how",
	platform: "platform",
	teams: "teams",
} as const;

export function BrandLockup({ className }: { className?: string }) {
	return (
		<span className={cn("flex items-center gap-2.5", className)}>
			{/* `bg-primary` is a fill — `text-primary-foreground` is its only legal copy colour. */}
			<span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
				<FlameIcon aria-hidden className="size-5" />
			</span>
			<span className="font-bold text-lg tracking-tight">Brnit</span>
		</span>
	);
}

export function LandingNav() {
	const { copy } = useI18n();
	const scrolled = useScrolledPast(16);
	const [menuOpen, setMenuOpen] = useState(false);

	const links = [
		{ href: `#${SECTION_IDS.platform}`, label: copy.nav.features },
		{ href: `#${SECTION_IDS.how}`, label: copy.nav.how },
		{ href: `#${SECTION_IDS.teams}`, label: copy.nav.roles },
		{ href: `#${SECTION_IDS.faq}`, label: copy.nav.faq },
	];

	useEffect(() => {
		if (!menuOpen) {
			return;
		}

		const close = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setMenuOpen(false);
			}
		};

		window.addEventListener("keydown", close);

		return () => window.removeEventListener("keydown", close);
	}, [menuOpen]);

	return (
		<header className="fixed inset-x-0 top-0 z-50">
			<div
				className={cn(
					"transition-[background-color,box-shadow,backdrop-filter] duration-300 ease-standard",
					// The open menu needs an opaque backdrop: translucent chrome over
					// the hero copy makes the links unreadable.
					menuOpen && "bg-background shadow-float",
					!menuOpen &&
						scrolled &&
						"bg-background/80 shadow-soft backdrop-blur-xl",
					!(menuOpen || scrolled) && "bg-transparent"
				)}
			>
				<LandingContainer>
					<div className="flex h-16 items-center justify-between gap-3 sm:h-18">
						<a
							className="rounded-xl outline-offset-4 transition-opacity hover:opacity-90"
							href="#top"
						>
							<BrandLockup />
							<span className="sr-only">Brnit</span>
						</a>

						<nav className="hidden items-center gap-1 lg:flex">
							{links.map((link) => (
								<a
									className="rounded-full px-3.5 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground"
									href={link.href}
									key={link.href}
								>
									{link.label}
								</a>
							))}
						</nav>

						<div className="flex items-center gap-1">
							<LanguageSwitcher />
							<ModeToggle />
							<Button
								className="hidden sm:inline-flex"
								nativeButton={false}
								render={<Link search={{}} to="/login" />}
								size="sm"
								variant="ghost"
							>
								{copy.nav.login}
							</Button>
							<a
								className={cn(
									buttonVariants({ size: "sm" }),
									"hidden md:inline-flex"
								)}
								href={`#${SECTION_IDS.demo}`}
							>
								{copy.nav.demo}
							</a>
							<Button
								aria-expanded={menuOpen}
								aria-label={menuOpen ? copy.nav.close : copy.nav.menu}
								className="lg:hidden"
								onClick={() => setMenuOpen((open) => !open)}
								size="icon-sm"
								variant="ghost"
							>
								{menuOpen ? (
									<XIcon aria-hidden className="size-5" />
								) : (
									<MenuIcon aria-hidden className="size-5" />
								)}
							</Button>
						</div>
					</div>
				</LandingContainer>

				<div
					className={cn(
						"grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-emphasized lg:hidden",
						menuOpen
							? "grid-rows-[1fr] opacity-100"
							: "grid-rows-[0fr] opacity-0"
					)}
				>
					<div className="min-h-0">
						<LandingContainer className="pb-5">
							<nav className="flex flex-col gap-1 border-border/70 border-t pt-4">
								{links.map((link) => (
									<a
										className="rounded-xl px-3 py-2.5 font-medium text-base text-foreground transition-colors hover:bg-accent"
										href={link.href}
										key={link.href}
										onClick={() => setMenuOpen(false)}
									>
										{link.label}
									</a>
								))}
								<div className="mt-2 flex flex-col gap-2 sm:flex-row">
									<Button
										className="flex-1"
										nativeButton={false}
										onClick={() => setMenuOpen(false)}
										render={<Link search={{}} to="/login" />}
										variant="secondary"
									>
										{copy.nav.login}
									</Button>
									<a
										className={cn(buttonVariants(), "flex-1")}
										href={`#${SECTION_IDS.demo}`}
										onClick={() => setMenuOpen(false)}
									>
										{copy.nav.demo}
									</a>
								</div>
							</nav>
						</LandingContainer>
					</div>
				</div>
			</div>
		</header>
	);
}
