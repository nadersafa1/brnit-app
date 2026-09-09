import {
	ActivityIcon,
	FlameIcon,
	ScaleIcon,
	UsersRoundIcon,
} from "lucide-react";

import { useCountUp, useInView, useParallax } from "@/hooks/use-scroll-motion";
import { useI18n } from "@/lib/i18n/i18n-provider";

import { Eyebrow, LandingContainer, LandingSection } from "./landing-section";
import { Reveal } from "./reveal";

/** Illustrative weekly readings for the panel's chart, in percent. */
const CHART_BARS = [46, 58, 54, 71, 78, 88] as const;

export function LandingPreview() {
	const { copy } = useI18n();
	const [metricsRef, metricsInView] = useInView<HTMLUListElement>();
	const panelRef = useParallax<HTMLDivElement>(-40);

	return (
		<LandingSection className="relative overflow-hidden">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
			>
				<div className="brnit-blob brnit-blob-alt absolute end-[-20%] top-[10%] size-[60vw] max-w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,var(--brand-accent-soft),transparent_70%)] blur-2xl" />
			</div>

			<LandingContainer className="relative z-10">
				<div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
					<div>
						<Reveal className="flex flex-col items-start gap-5">
							<Eyebrow>{copy.preview.eyebrow}</Eyebrow>
							<h2 className="text-balance font-bold text-[clamp(1.85rem,4.4vw,3.05rem)] leading-[1.08] tracking-tight">
								{copy.preview.title}
							</h2>
							<p className="text-pretty text-base text-muted-foreground leading-relaxed">
								{copy.preview.subtitle}
							</p>
						</Reveal>

						<ul className="mt-10 grid gap-6 sm:grid-cols-3" ref={metricsRef}>
							{copy.preview.metrics.map((metric, index) => (
								<Metric
									active={metricsInView}
									delay={index * 110}
									key={metric.label}
									label={metric.label}
									suffix={metric.suffix}
									value={metric.value}
								/>
							))}
						</ul>
					</div>

					<Reveal delay={120} variant="scale">
						<div className="translate-y-(--parallax)" ref={panelRef}>
							<DashboardPanel />
						</div>
					</Reveal>
				</div>
			</LandingContainer>
		</LandingSection>
	);
}

interface MetricProps {
	active: boolean;
	delay: number;
	label: string;
	suffix: string;
	value: number;
}

function Metric({ active, delay, label, suffix, value }: MetricProps) {
	const counted = useCountUp(value, active);
	const { formatNumber } = useI18n();

	return (
		<li>
			<Reveal delay={delay}>
				<p className="font-bold text-4xl text-accent-fg tabular-nums">
					{formatNumber(counted)}
					{suffix}
				</p>
				<p className="mt-1.5 text-muted-foreground text-sm leading-snug">
					{label}
				</p>
			</Reveal>
		</li>
	);
}

function DashboardPanel() {
	const { copy } = useI18n();
	const panel = copy.preview.panel;
	const [chartRef, chartInView] = useInView<HTMLDivElement>();

	const tiles = [
		{ icon: UsersRoundIcon, label: panel.members, value: "128" },
		{ icon: ActivityIcon, label: panel.adherence, value: "82%" },
		{ icon: ScaleIcon, label: panel.assessments, value: "96" },
		{ icon: FlameIcon, label: panel.streak, value: "31" },
	];

	return (
		<figure className="m-0 rounded-3xl bg-card p-5 shadow-float ring-1 ring-brand-overlay-soft sm:p-7">
			<div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
				<p className="font-semibold text-base">{panel.title}</p>
				<span className="flex items-center gap-2 whitespace-nowrap rounded-full bg-accent-soft px-3 py-1 font-medium text-[0.7rem] text-accent-fg">
					<span className="size-1.5 rounded-full bg-primary" />
					{panel.chart}
				</span>
			</div>

			<ul className="mt-5 grid grid-cols-2 gap-3">
				{tiles.map((tile) => (
					<li className="rounded-2xl bg-brand-card-alt p-4" key={tile.label}>
						<span className="flex size-8 items-center justify-center rounded-xl bg-card text-accent-fg shadow-soft">
							<tile.icon aria-hidden className="size-4" />
						</span>
						<p className="mt-3 font-bold text-2xl tabular-nums">{tile.value}</p>
						<p className="mt-0.5 text-[0.72rem] text-muted-foreground leading-snug">
							{tile.label}
						</p>
					</li>
				))}
			</ul>

			<div className="mt-5 rounded-2xl bg-brand-card-alt p-4" ref={chartRef}>
				<div className="flex h-32 items-end gap-2 sm:h-36">
					{CHART_BARS.map((height, index) => (
						<span
							className="flex-1 origin-bottom rounded-t-lg bg-primary/85 transition-transform duration-700 ease-emphasized motion-reduce:transition-none"
							key={panel.weeks[index] ?? height}
							style={{
								height: `${height}%`,
								transitionDelay: `${index * 90}ms`,
								transform: chartInView ? "scaleY(1)" : "scaleY(0.04)",
							}}
						/>
					))}
				</div>
				<ul className="mt-2.5 flex gap-2">
					{panel.weeks.map((week) => (
						<li
							className="flex-1 text-center text-[0.65rem] text-muted-foreground"
							key={week}
						>
							{week}
						</li>
					))}
				</ul>
			</div>

			<figcaption className="mt-4 text-[0.7rem] text-muted-foreground">
				{copy.preview.caption}
			</figcaption>
		</figure>
	);
}
