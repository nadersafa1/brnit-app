import {
	CheckIcon,
	HeartPulseIcon,
	SaladIcon,
	UserRoundIcon,
} from "lucide-react";

import { useI18n } from "@/lib/i18n/i18n-provider";

import { SECTION_IDS } from "./landing-nav";
import {
	LandingContainer,
	LandingSection,
	SectionHeading,
} from "./landing-section";
import { Reveal } from "./reveal";

const ICONS = [HeartPulseIcon, SaladIcon, UserRoundIcon] as const;

export function LandingRoles() {
	const { copy } = useI18n();

	return (
		<LandingSection id={SECTION_IDS.teams}>
			<LandingContainer>
				<SectionHeading
					eyebrow={copy.roles.eyebrow}
					subtitle={copy.roles.subtitle}
					title={copy.roles.title}
				/>

				<ul className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
					{copy.roles.cards.map((card, index) => {
						const Icon = ICONS[index] ?? HeartPulseIcon;

						return (
							<li className="h-full" key={card.title}>
								<Reveal
									className="flex h-full flex-col rounded-3xl bg-card p-6 shadow-soft transition-[transform,box-shadow] duration-300 ease-emphasized hover:-translate-y-1 hover:shadow-float sm:p-7"
									delay={index * 90}
								>
									<span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
										<Icon aria-hidden className="size-6" />
									</span>
									<h3 className="mt-5 font-semibold text-xl leading-snug">
										{card.title}
									</h3>
									<p className="mt-2.5 mb-6 text-muted-foreground text-sm leading-relaxed">
										{card.body}
									</p>
									<ul className="mt-auto flex flex-col gap-2.5 border-border/70 border-t pt-5">
										{card.bullets.map((bullet) => (
											<li
												className="flex items-start gap-2.5 text-sm"
												key={bullet}
											>
												<CheckIcon
													aria-hidden
													className="mt-0.5 size-4 shrink-0 text-accent-fg"
												/>
												<span className="text-foreground/85">{bullet}</span>
											</li>
										))}
									</ul>
								</Reveal>
							</li>
						);
					})}
				</ul>
			</LandingContainer>
		</LandingSection>
	);
}
