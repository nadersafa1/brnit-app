import { CalendarXIcon, EyeOffIcon, FileWarningIcon } from "lucide-react";

import { useParallax } from "@/hooks/use-scroll-motion";
import { useI18n } from "@/lib/i18n/i18n-provider";

import {
	LandingContainer,
	LandingSection,
	SectionHeading,
} from "./landing-section";
import { Reveal } from "./reveal";

const ICONS = [CalendarXIcon, FileWarningIcon, EyeOffIcon] as const;

/** Each card drifts at its own rate, so the row separates into layers on scroll. */
const PARALLAX = [26, 54, 26] as const;

export function LandingShift() {
	const { copy } = useI18n();

	return (
		<LandingSection className="overflow-hidden">
			<LandingContainer>
				<SectionHeading
					eyebrow={copy.shift.eyebrow}
					subtitle={copy.shift.subtitle}
					title={copy.shift.title}
				/>

				<ul className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
					{copy.shift.cards.map((card, index) => (
						<ShiftCard
							body={card.body}
							index={index}
							key={card.title}
							title={card.title}
						/>
					))}
				</ul>
			</LandingContainer>
		</LandingSection>
	);
}

function ShiftCard({
	body,
	index,
	title,
}: {
	body: string;
	index: number;
	title: string;
}) {
	const ref = useParallax<HTMLLIElement>(PARALLAX[index] ?? 26);
	const Icon = ICONS[index] ?? CalendarXIcon;

	return (
		<li className="translate-y-(--parallax)" ref={ref}>
			<Reveal
				className="h-full rounded-3xl bg-card p-6 shadow-soft transition-shadow duration-300 hover:shadow-float sm:p-7"
				delay={index * 90}
			>
				<span className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-fg">
					<Icon aria-hidden className="size-5" />
				</span>
				<h3 className="mt-5 font-semibold text-lg leading-snug">{title}</h3>
				<p className="mt-2.5 text-muted-foreground text-sm leading-relaxed">
					{body}
				</p>
			</Reveal>
		</li>
	);
}
