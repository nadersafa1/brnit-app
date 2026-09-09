import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@brnit/ui/components/accordion";

import { useI18n } from "@/lib/i18n/i18n-provider";

import { SECTION_IDS } from "./landing-nav";
import {
	LandingContainer,
	LandingSection,
	SectionHeading,
} from "./landing-section";
import { Reveal } from "./reveal";

export function LandingFaq() {
	const { copy } = useI18n();

	return (
		<LandingSection id={SECTION_IDS.faq}>
			<LandingContainer>
				<SectionHeading eyebrow={copy.faq.eyebrow} title={copy.faq.title} />

				<Reveal className="mx-auto mt-12 w-full max-w-3xl" delay={80}>
					<Accordion>
						{copy.faq.items.map((item) => (
							<AccordionItem key={item.question} value={item.question}>
								<AccordionTrigger className="text-base">
									{item.question}
								</AccordionTrigger>
								<AccordionContent>{item.answer}</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</Reveal>
			</LandingContainer>
		</LandingSection>
	);
}
