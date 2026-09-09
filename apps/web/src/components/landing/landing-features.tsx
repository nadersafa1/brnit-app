import { cn } from "@brnit/ui/lib/utils";
import {
	ClipboardListIcon,
	FlameIcon,
	LineChartIcon,
	RepeatIcon,
	SmartphoneIcon,
	UsersRoundIcon,
} from "lucide-react";

import { useI18n } from "@/lib/i18n/i18n-provider";

import { SECTION_IDS } from "./landing-nav";
import {
	LandingContainer,
	LandingSection,
	SectionHeading,
} from "./landing-section";
import { Reveal } from "./reveal";

const ICONS = [
	ClipboardListIcon,
	RepeatIcon,
	LineChartIcon,
	FlameIcon,
	UsersRoundIcon,
	SmartphoneIcon,
] as const;

/**
 * A bento rather than a uniform grid: the plan builder is the product's centre
 * of gravity and the reach card is a footnote, so they are sized accordingly.
 * The spans resolve to full rows at both `sm` (2 columns) and `lg` (3), which
 * is why there is never a hole in the layout.
 */
const SPANS: Record<number, string> = {
	0: "sm:col-span-2",
	5: "sm:col-span-2 lg:col-span-3",
};

/** A week of a plan, as a strip of day pills. Decoration for the lead card. */
const PLAN_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const ACTIVE_DAY = 3;

export function LandingFeatures() {
	const { copy } = useI18n();

	return (
		<LandingSection className="overflow-hidden" id={SECTION_IDS.platform}>
			<LandingContainer>
				<SectionHeading
					eyebrow={copy.features.eyebrow}
					subtitle={copy.features.subtitle}
					title={copy.features.title}
				/>

				<div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{copy.features.cards.map((card, index) => {
						const Icon = ICONS[index] ?? ClipboardListIcon;

						return (
							<Reveal
								className={cn(
									"group/card relative flex h-full flex-col overflow-hidden rounded-3xl bg-card p-6 shadow-soft transition-shadow duration-300 hover:shadow-float sm:p-7",
									SPANS[index]
								)}
								delay={(index % 3) * 80}
								key={card.title}
							>
								{/* A soft accent wash that grows out of the icon on hover. */}
								<span
									aria-hidden
									className="pointer-events-none absolute -end-16 -top-16 size-40 rounded-full bg-accent-soft opacity-0 blur-2xl transition-opacity duration-500 group-hover/card:opacity-100"
								/>

								<div
									className={cn(
										"relative flex flex-1 flex-col",
										// The full-width card would otherwise be one short
										// paragraph adrift in a very wide box.
										index === 5 && "lg:flex-row lg:items-center lg:gap-14"
									)}
								>
									<div className={cn(index === 5 && "lg:flex-1")}>
										<div className="flex items-center gap-3">
											<span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-fg transition-transform duration-300 group-hover/card:scale-105">
												<Icon aria-hidden className="size-5" />
											</span>
											<span className="brnit-eyebrow font-semibold text-[0.7rem] text-muted-foreground uppercase">
												{card.tag}
											</span>
										</div>

										<h3 className="mt-5 text-balance font-semibold text-lg leading-snug sm:text-xl">
											{card.title}
										</h3>
										<p className="mt-2.5 max-w-prose text-muted-foreground text-sm leading-relaxed">
											{card.body}
										</p>
									</div>

									{index === 0 ? <PlanStrip /> : null}
									{index === 5 ? <SurfaceStrip /> : null}
								</div>
							</Reveal>
						);
					})}
				</div>
			</LandingContainer>
		</LandingSection>
	);
}

function PlanStrip() {
	return (
		<ul aria-hidden className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-2">
			{PLAN_DAYS.map((day) => (
				<li
					className={cn(
						"flex h-9 items-center justify-center rounded-xl font-semibold text-xs",
						day === ACTIVE_DAY
							? "bg-primary text-primary-foreground shadow-soft"
							: "bg-brand-surface-alt text-muted-foreground"
					)}
					key={day}
				>
					{day}
				</li>
			))}
		</ul>
	);
}

const SURFACES = ["iOS", "Android", "Web"] as const;

function SurfaceStrip() {
	return (
		<ul
			aria-hidden
			className="mt-6 flex flex-wrap gap-2 lg:mt-0 lg:shrink-0 lg:gap-3"
		>
			{SURFACES.map((surface) => (
				<li
					className="rounded-2xl bg-brand-surface-alt px-5 py-3 font-semibold text-muted-foreground text-sm lg:px-7 lg:py-5"
					key={surface}
				>
					{surface}
				</li>
			))}
		</ul>
	);
}
