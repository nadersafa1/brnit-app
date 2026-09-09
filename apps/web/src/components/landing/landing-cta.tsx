import { Button, buttonVariants } from "@brnit/ui/components/button";
import { cn } from "@brnit/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { useI18n } from "@/lib/i18n/i18n-provider";

import { DEMO_MAILTO } from "./contact";
import { SECTION_IDS } from "./landing-nav";
import { LandingContainer, LandingSection } from "./landing-section";
import { Reveal } from "./reveal";

/**
 * The closing band, and the target of every "Book a demo" in the page.
 *
 * It sits on `--chrome` — the one surface that is dark in both themes — so the
 * page ends on a deliberate contrast shift. Copy on it must be
 * `text-chrome-foreground`; the orange stays a fill behind the glow and inside
 * the primary button, never a text colour.
 */
export function LandingCta() {
	const { copy } = useI18n();

	return (
		<LandingSection className="pb-8 sm:pb-10" id={SECTION_IDS.demo}>
			<LandingContainer>
				<Reveal variant="scale">
					<div className="relative isolate overflow-hidden rounded-[2rem] bg-chrome px-6 py-16 text-center shadow-float sm:px-12 sm:py-20">
						<div
							aria-hidden
							className="pointer-events-none absolute inset-0 -z-10"
						>
							<div className="brnit-blob absolute start-[-10%] -top-1/3 size-[36rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(253,110,32,0.42),transparent_66%)] blur-2xl" />
							<div className="brnit-blob brnit-blob-alt absolute end-[-12%] -bottom-1/2 size-[32rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(201,190,250,0.32),transparent_68%)] blur-2xl" />
							<div className="brnit-grain absolute inset-0 opacity-[0.18]" />
						</div>

						<h2 className="mx-auto max-w-3xl text-balance font-bold text-[clamp(1.9rem,4.6vw,3.2rem)] text-chrome-foreground leading-[1.08] tracking-tight">
							{copy.cta.title}
						</h2>
						<p className="mx-auto mt-5 max-w-xl text-pretty text-base text-chrome-muted leading-relaxed">
							{copy.cta.subtitle}
						</p>

						<div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
							<a
								className={cn(
									buttonVariants({ size: "lg" }),
									"w-full sm:w-auto"
								)}
								href={DEMO_MAILTO}
							>
								{copy.cta.primary}
								<ArrowRightIcon aria-hidden className="rtl:rotate-180" />
							</a>
							<Button
								className="w-full border-brand-chrome-overlay text-chrome-foreground hover:bg-brand-chrome-overlay hover:text-chrome-foreground sm:w-auto"
								nativeButton={false}
								render={<Link to="/signup" />}
								size="lg"
								variant="outline"
							>
								{copy.cta.secondary}
							</Button>
						</div>

						<p className="mt-6 text-chrome-muted text-xs">{copy.cta.note}</p>
					</div>
				</Reveal>
			</LandingContainer>
		</LandingSection>
	);
}
