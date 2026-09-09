import { buttonVariants } from "@brnit/ui/components/button";
import { cn } from "@brnit/ui/lib/utils";
import { ArrowDownIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { Suspense } from "react";

import { useScrollProgress } from "@/hooks/use-scroll-motion";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { lazyPage } from "@/lib/lazy-page";

import { HeroShowcase } from "./hero-showcase";
import { SECTION_IDS } from "./landing-nav";
import { Eyebrow, LandingContainer } from "./landing-section";
import { Reveal } from "./reveal";

/**
 * `three` is ~150 kB gzipped — far too much to sit in front of the headline.
 * The scene is a separate chunk that fades in once it arrives; the gradient
 * fields below are the composition until then, and forever on a device that
 * cannot run WebGL.
 */
const HeroCanvas = lazyPage<{ className?: string }>(
	() => import("./hero-canvas"),
	"HeroCanvas"
);

function HeroBackdrop() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
		>
			<div className="brnit-blob absolute start-[-18%] -top-[22%] size-[85vw] max-w-[52rem] rounded-full bg-[radial-gradient(circle_at_center,var(--brand-accent-soft),transparent_68%)] blur-2xl" />
			<div className="brnit-blob brnit-blob-alt absolute end-[-22%] top-[6%] size-[78vw] max-w-[48rem] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--brand-decorative)_55%,transparent),transparent_66%)] blur-2xl" />
			<div className="brnit-blob absolute start-[28%] bottom-[-30%] size-[62vw] max-w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--brand-accent)_16%,transparent),transparent_70%)] blur-3xl" />

			<Suspense fallback={null}>
				<HeroCanvas className="absolute inset-x-0 top-[26%] bottom-0 opacity-70 lg:inset-y-0 lg:start-[12%] lg:end-0 lg:opacity-100" />
			</Suspense>

			<div className="brnit-grain absolute inset-0 opacity-[0.13]" />
			<div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
		</div>
	);
}

export function LandingHero() {
	const { copy } = useI18n();
	const sectionRef = useScrollProgress<HTMLElement>();

	return (
		<section
			className="relative isolate overflow-hidden"
			id="top"
			ref={sectionRef}
		>
			<HeroBackdrop />

			<LandingContainer className="relative z-10 flex min-h-svh flex-col justify-center pt-24 pb-36 sm:pt-28 lg:pb-24">
				<div className="grid grid-cols-1 items-center gap-20 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)] lg:gap-10">
					<div
						// Holds full strength for the first half of the hero's travel,
						// then dissolves — a fade that starts on the first pixel makes
						// the copy look washed out while it is still the thing you are
						// reading. `--progress` is unset under reduced motion, and the
						// fallback puts both values back at their resting state.
						style={{
							opacity: "clamp(0.15, calc((1 - var(--progress, 0)) * 1.85), 1)",
							translate: "0 calc(var(--progress, 0) * 44px)",
						}}
					>
						<Reveal variant="fade">
							<Eyebrow>{copy.hero.badge}</Eyebrow>
						</Reveal>

						<Reveal delay={90}>
							<h1 className="mt-5 max-w-[16ch] text-balance font-bold text-[clamp(2.2rem,5.6vw,3.9rem)] leading-[1.04] tracking-tight">
								{copy.hero.titleLead} {/*
								 * `box-decoration-clone` gives every wrapped line its own rounded
								 * highlight instead of one bar stretched across the block — the
								 * phrase wraps at three different points between 320px and 1920px.
								 */}
								<span className="rounded-2xl bg-accent-soft box-decoration-clone px-[0.14em] text-accent-fg dark:bg-primary/12">
									{copy.hero.titleAccent}
								</span>
							</h1>
						</Reveal>

						<Reveal delay={170}>
							<p className="mt-5 max-w-xl text-pretty text-base text-muted-foreground leading-relaxed sm:text-lg">
								{copy.hero.subtitle}
							</p>
						</Reveal>

						<Reveal delay={250}>
							<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
								{/*
								 * Real anchors carrying the button styling, rather than
								 * `<Button render={<a/>}>`: these navigate, so they should be
								 * links in the accessibility tree and in the DOM.
								 */}
								<a
									className={cn(
										buttonVariants({ size: "lg" }),
										"w-full sm:w-auto"
									)}
									href={`#${SECTION_IDS.demo}`}
								>
									{copy.hero.primaryCta}
									<ArrowRightIcon aria-hidden className="rtl:rotate-180" />
								</a>
								<a
									className={cn(
										buttonVariants({ size: "lg", variant: "secondary" }),
										"w-full sm:w-auto"
									)}
									href={`#${SECTION_IDS.how}`}
								>
									{copy.hero.secondaryCta}
									<ArrowDownIcon aria-hidden />
								</a>
							</div>
						</Reveal>

						<Reveal delay={330}>
							<ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5">
								{copy.hero.chips.map((chip) => (
									<li
										className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm"
										key={chip}
									>
										<CheckIcon
											aria-hidden
											className="size-4 shrink-0 text-accent-fg"
										/>
										{chip}
									</li>
								))}
							</ul>
						</Reveal>
					</div>

					<Reveal delay={220} variant="scale">
						<HeroShowcase />
					</Reveal>
				</div>
			</LandingContainer>

			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 bottom-6 z-10 hidden justify-center sm:flex"
				style={{ opacity: "calc(1 - var(--progress, 0) * 3)" }}
			>
				<span className="brnit-eyebrow flex flex-col items-center gap-2 text-[0.65rem] text-muted-foreground uppercase">
					{copy.hero.scrollHint}
					<span className="relative h-10 w-px overflow-hidden bg-border">
						<span className="brnit-float absolute inset-x-0 top-0 h-4 bg-primary" />
					</span>
				</span>
			</div>
		</section>
	);
}
