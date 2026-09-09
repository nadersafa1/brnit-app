import { cn } from "@brnit/ui/lib/utils";
import {
	CheckIcon,
	FlameIcon,
	RepeatIcon,
	TrendingDownIcon,
} from "lucide-react";

import { useParallax } from "@/hooks/use-scroll-motion";
import { useI18n } from "@/lib/i18n/i18n-provider";

/**
 * The product mock beside the hero copy.
 *
 * It is a *drawing* of the app rather than a screenshot: it stays crisp at any
 * width, follows the theme, and — the reason it exists here rather than as an
 * image — every string in it comes from the dictionary, so it flips to Arabic
 * and RTL with the rest of the page.
 *
 * Each of the three pieces takes a different parallax strength, which is what
 * makes the group read as depth instead of one flat picture.
 */

const RING_CIRCUMFERENCE = 2 * Math.PI * 34;
const RING_PROGRESS = 0.72;

/** A fortnight of body-fat readings — illustrative, and the shape of the story. */
const TREND_POINTS = "0,26 14,24 28,25 42,19 56,20 70,14 84,11 98,6";

function MacroRing({ label }: { label: string }) {
	return (
		<div className="relative flex size-24 shrink-0 items-center justify-center">
			<svg
				aria-hidden="true"
				className="size-24 -rotate-90"
				viewBox="0 0 80 80"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle
					className="stroke-brand-surface-alt"
					cx="40"
					cy="40"
					fill="none"
					r="34"
					strokeWidth="8"
				/>
				<circle
					className="stroke-primary"
					cx="40"
					cy="40"
					fill="none"
					r="34"
					strokeDasharray={RING_CIRCUMFERENCE}
					strokeDashoffset={RING_CIRCUMFERENCE * (1 - RING_PROGRESS)}
					strokeLinecap="round"
					strokeWidth="8"
				/>
			</svg>
			<span className="absolute flex flex-col items-center">
				<span className="font-bold text-lg leading-none">1,210</span>
				<span className="text-[0.65rem] text-muted-foreground">{label}</span>
			</span>
		</div>
	);
}

export function HeroShowcase({ className }: { className?: string }) {
	const { copy } = useI18n();
	const card = copy.heroCard;
	const mainRef = useParallax<HTMLDivElement>(-34);
	const trendRef = useParallax<HTMLDivElement>(22);
	const streakRef = useParallax<HTMLDivElement>(-40);

	return (
		<div
			className={cn(
				"relative mx-auto w-full max-w-md lg:max-w-none",
				className
			)}
		>
			<div
				className="brnit-float brnit-float-slow relative z-10 translate-y-(--parallax) rounded-3xl bg-card p-5 shadow-float ring-1 ring-brand-overlay-soft sm:p-6"
				ref={mainRef}
			>
				<div className="flex items-center gap-3">
					<span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
						<FlameIcon aria-hidden className="size-5" />
					</span>
					<div className="min-w-0 flex-1">
						<p className="truncate font-semibold text-base">{card.title}</p>
						<p className="truncate text-muted-foreground text-xs">
							{card.subtitle}
						</p>
					</div>
					{/* Garnish: it is the first thing to go when 320px needs the room. */}
					<span className="xs:inline-flex hidden items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 font-medium text-[0.7rem] text-accent-fg">
						<CheckIcon aria-hidden className="size-3" />
						{card.logged}
					</span>
				</div>

				<div className="mt-5 flex items-center gap-4">
					<MacroRing label="kcal" />
					<ul className="flex min-w-0 flex-1 flex-col gap-2.5">
						{card.macros.map((macro, index) => (
							<li className="flex flex-col gap-1" key={macro.label}>
								<div className="flex items-center justify-between gap-2 text-xs">
									<span className="text-muted-foreground">{macro.label}</span>
									<span className="font-semibold tabular-nums">
										{macro.value}
									</span>
								</div>
								<span className="block h-1.5 overflow-hidden rounded-full bg-brand-surface-alt">
									<span
										className="block h-full rounded-full bg-primary/80"
										style={{ width: `${[82, 64, 47][index] ?? 60}%` }}
									/>
								</span>
							</li>
						))}
					</ul>
				</div>

				<ul className="mt-5 flex flex-col gap-2">
					{card.meals.map((meal) => (
						<li
							className="flex items-center gap-3 rounded-2xl bg-brand-card-alt px-3 py-2.5"
							key={meal.name}
						>
							<span className="size-2 shrink-0 rounded-full bg-brand-decorative" />
							<span className="min-w-0 flex-1 truncate font-medium text-xs">
								{meal.name}
							</span>
							<span className="shrink-0 text-[0.7rem] text-muted-foreground tabular-nums">
								{meal.detail}
							</span>
							<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-card px-2 py-1 font-medium text-[0.65rem] text-accent-fg shadow-soft">
								<RepeatIcon aria-hidden className="size-3" />
								<span className="xs:inline hidden">{card.swap}</span>
							</span>
						</li>
					))}
				</ul>
			</div>

			<div
				className="brnit-float brnit-float-fast absolute start-0 -bottom-28 z-20 w-40 translate-y-(--parallax) rounded-2xl bg-card p-4 shadow-float ring-1 ring-brand-overlay-soft sm:-start-10 sm:w-48 lg:-bottom-24"
				ref={trendRef}
			>
				<p className="text-muted-foreground text-xs">{card.trendLabel}</p>
				<p
					className="mt-0.5 flex w-fit items-center gap-1.5 font-bold text-accent-fg text-xl"
					dir="ltr"
				>
					<TrendingDownIcon aria-hidden className="size-4" />
					{card.trendValue}
				</p>
				<svg
					aria-hidden="true"
					className="mt-2 h-8 w-full"
					preserveAspectRatio="none"
					viewBox="0 0 98 32"
					xmlns="http://www.w3.org/2000/svg"
				>
					<polyline
						className="stroke-primary"
						fill="none"
						points={TREND_POINTS}
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2.5"
					/>
				</svg>
				<p className="text-[0.65rem] text-muted-foreground">
					{card.trendCaption}
				</p>
			</div>

			<div
				className="brnit-float absolute end-0 -top-6 z-20 translate-y-(--parallax) sm:-end-6"
				ref={streakRef}
			>
				<span className="inline-flex items-center gap-2 rounded-full bg-chrome px-4 py-2.5 font-semibold text-chrome-foreground text-xs shadow-float">
					<FlameIcon aria-hidden className="size-4 text-primary" />
					{card.streak}
				</span>
			</div>
		</div>
	);
}
