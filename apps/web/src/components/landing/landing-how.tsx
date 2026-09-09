import { cn } from "@brnit/ui/lib/utils";

import { useInView, useScrollProgress } from "@/hooks/use-scroll-motion";
import { useI18n } from "@/lib/i18n/i18n-provider";

import { SECTION_IDS } from "./landing-nav";
import { Eyebrow, LandingContainer, LandingSection } from "./landing-section";
import { Reveal } from "./reveal";

/**
 * The scroll centrepiece: the heading sticks while the four steps travel past
 * it, and the rail beside it fills as they do.
 *
 * The rail is driven entirely by the `--progress` custom property that
 * `useScrollProgress` writes on the wrapper — including the dots, which each
 * light at their own threshold through a `clamp()` on `--progress`. Nothing
 * here re-renders on scroll; the only React state is each card's "am I the one
 * in the middle of the screen" flag, and its resting style is fully legible, so
 * a browser that never fires it still reads correctly.
 */
export function LandingHow() {
	const { copy } = useI18n();
	const wrapperRef = useScrollProgress<HTMLDivElement>();

	return (
		<LandingSection className="relative" id={SECTION_IDS.how}>
			<LandingContainer>
				<div
					className="relative grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16"
					ref={wrapperRef}
				>
					<div className="lg:sticky lg:top-28 lg:h-fit lg:self-start">
						<Reveal className="flex flex-col items-start gap-5">
							<Eyebrow>{copy.how.eyebrow}</Eyebrow>
							<h2 className="text-balance font-bold text-[clamp(1.85rem,4.4vw,3.05rem)] leading-[1.08] tracking-tight">
								{copy.how.title}
							</h2>
							<p className="text-pretty text-base text-muted-foreground leading-relaxed">
								{copy.how.subtitle}
							</p>
						</Reveal>

						<div
							aria-hidden
							className="mt-10 hidden items-center gap-4 lg:flex"
						>
							<span className="relative block h-44 w-1 overflow-hidden rounded-full bg-border">
								<span className="brnit-rail-fill absolute inset-x-0 top-0 h-full rounded-full bg-primary" />
							</span>
							<ul className="flex h-44 flex-col justify-between">
								{copy.how.steps.map((step, index) => (
									<li
										className="font-semibold text-muted-foreground text-xs tabular-nums transition-colors"
										key={step.title}
										style={{
											opacity: `clamp(0.35, calc((var(--progress, 0) - ${(
												index * 0.22
											).toFixed(2)}) * 9), 1)`,
										}}
									>
										{String(index + 1).padStart(2, "0")}
									</li>
								))}
							</ul>
						</div>
					</div>

					<ol className="flex flex-col gap-5 lg:gap-8">
						{copy.how.steps.map((step, index) => (
							<HowStep
								body={step.body}
								caption={step.caption}
								index={index}
								key={step.title}
								title={step.title}
							/>
						))}
					</ol>
				</div>
			</LandingContainer>
		</LandingSection>
	);
}

interface HowStepProps {
	body: string;
	caption: string;
	index: number;
	title: string;
}

function HowStep({ body, caption, index, title }: HowStepProps) {
	// The band is the middle 30% of the viewport: whichever card is centred is
	// the "current" one. `once: false` so it hands the highlight on.
	const [ref, active] = useInView<HTMLLIElement>({
		once: false,
		rootMargin: "-35% 0px -35% 0px",
		threshold: 0,
	});

	return (
		<li className="lg:min-h-[42vh]" ref={ref}>
			<Reveal delay={index * 70}>
				<div
					className={cn(
						"rounded-3xl bg-card p-6 shadow-soft transition-[box-shadow,opacity,transform] duration-500 ease-emphasized sm:p-8",
						active
							? "opacity-100 lg:shadow-float"
							: "opacity-100 lg:scale-[0.985] lg:opacity-70"
					)}
				>
					<div className="flex items-center gap-3.5">
						<span
							className={cn(
								"flex size-11 shrink-0 items-center justify-center rounded-2xl font-bold text-sm tabular-nums transition-colors duration-500",
								active
									? "bg-primary text-primary-foreground shadow-soft"
									: "bg-accent-soft text-accent-fg"
							)}
						>
							{String(index + 1).padStart(2, "0")}
						</span>
						<span className="brnit-eyebrow font-semibold text-[0.68rem] text-muted-foreground uppercase">
							{caption}
						</span>
					</div>

					<h3 className="mt-5 text-balance font-semibold text-xl leading-snug sm:text-2xl">
						{title}
					</h3>
					<p className="mt-3 max-w-prose text-muted-foreground leading-relaxed">
						{body}
					</p>
				</div>
			</Reveal>
		</li>
	);
}
