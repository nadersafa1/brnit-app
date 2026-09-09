import { Link } from "@tanstack/react-router";

import { useI18n } from "@/lib/i18n/i18n-provider";

import { DEMO_MAILTO } from "./contact";
import { BrandLockup, SECTION_IDS } from "./landing-nav";
import { LandingContainer } from "./landing-section";
import { LanguageSwitcher } from "./language-switcher";

export function LandingFooter() {
	const { copy } = useI18n();

	const productLinks = [
		{ href: `#${SECTION_IDS.platform}`, label: copy.footer.links.features },
		{ href: `#${SECTION_IDS.how}`, label: copy.footer.links.how },
		{ href: `#${SECTION_IDS.teams}`, label: copy.footer.links.roles },
		{ href: `#${SECTION_IDS.faq}`, label: copy.footer.links.faq },
	];

	return (
		<footer className="border-border/70 border-t bg-card/50 pt-14 pb-10">
			<LandingContainer>
				<div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
					<div>
						<BrandLockup />
						<p className="mt-4 max-w-sm text-muted-foreground text-sm leading-relaxed">
							{copy.footer.tagline}
						</p>
					</div>

					<nav aria-label={copy.footer.columns.product}>
						<h2 className="brnit-eyebrow font-semibold text-[0.7rem] text-muted-foreground uppercase">
							{copy.footer.columns.product}
						</h2>
						<ul className="mt-4 flex flex-col gap-2.5">
							{productLinks.map((link) => (
								<li key={link.href}>
									<a
										className="text-foreground/85 text-sm transition-colors hover:text-accent-fg"
										href={link.href}
									>
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</nav>

					<nav aria-label={copy.footer.columns.company}>
						<h2 className="brnit-eyebrow font-semibold text-[0.7rem] text-muted-foreground uppercase">
							{copy.footer.columns.company}
						</h2>
						<ul className="mt-4 flex flex-col gap-2.5">
							<li>
								<a
									className="text-foreground/85 text-sm transition-colors hover:text-accent-fg"
									href={DEMO_MAILTO}
								>
									{copy.footer.links.demo}
								</a>
							</li>
							<li>
								<Link
									className="text-foreground/85 text-sm transition-colors hover:text-accent-fg"
									to="/signup"
								>
									{copy.footer.links.signup}
								</Link>
							</li>
							<li>
								<Link
									className="text-foreground/85 text-sm transition-colors hover:text-accent-fg"
									search={{}}
									to="/login"
								>
									{copy.footer.links.login}
								</Link>
							</li>
						</ul>
					</nav>
				</div>

				<div className="mt-12 flex flex-col-reverse items-start justify-between gap-4 border-border/70 border-t pt-6 sm:flex-row sm:items-center">
					<p className="text-muted-foreground text-xs">
						© {new Date().getFullYear()} Brnit. {copy.footer.rights}
					</p>
					<div className="flex items-center gap-1">
						<span className="text-muted-foreground text-xs">
							{copy.footer.language}
						</span>
						<LanguageSwitcher />
					</div>
				</div>
			</LandingContainer>
		</footer>
	);
}
