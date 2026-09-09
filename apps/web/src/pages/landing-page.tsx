import { LandingCta } from "@/components/landing/landing-cta";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHow } from "@/components/landing/landing-how";
import { LandingMarquee } from "@/components/landing/landing-marquee";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPreview } from "@/components/landing/landing-preview";
import { LandingRoles } from "@/components/landing/landing-roles";
import { LandingShift } from "@/components/landing/landing-shift";
import { useI18n } from "@/lib/i18n/i18n-provider";

import "@/styles/landing.css";

/**
 * The public landing page.
 *
 * One band per section, in reading order: the problem, the platform, the
 * rollout, the audiences, the evidence, the objections, the ask. The page owns
 * nothing but that order and the background — every band brings its own scroll
 * behaviour.
 */
export function LandingPage() {
	const { copy } = useI18n();

	return (
		<div className="brnit-landing relative flex min-h-svh flex-col bg-background text-foreground">
			<a
				className="sr-only rounded-full bg-card px-4 py-2 font-medium text-sm shadow-float focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60]"
				href="#main"
			>
				{copy.nav.skip}
			</a>

			<LandingNav />

			<main className="flex-1" id="main">
				<LandingHero />
				<LandingMarquee />
				<LandingShift />
				<LandingFeatures />
				<LandingHow />
				<LandingRoles />
				<LandingPreview />
				<LandingFaq />
				<LandingCta />
			</main>

			<LandingFooter />
		</div>
	);
}
