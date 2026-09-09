import { useI18n } from "@/lib/i18n/i18n-provider";

/**
 * The capability band under the hero.
 *
 * The track holds the list twice and translates exactly -50%, which is what
 * makes the loop seamless; `[dir="rtl"]` swaps to the mirrored keyframes in
 * `landing.css` so it always scrolls *against* the reading direction. Both
 * copies are `aria-hidden` and the band is labelled once for screen readers —
 * a duplicated list read aloud twice is noise.
 */
const TRACKS = ["primary", "clone"] as const;

export function LandingMarquee() {
	const { copy } = useI18n();

	return (
		<section className="relative overflow-hidden border-border/60 border-y bg-card/60 py-5 backdrop-blur-sm">
			<h2 className="sr-only">{copy.marquee.label}</h2>
			<p className="sr-only">{copy.marquee.items.join(", ")}</p>

			<div className="brnit-marquee-mask overflow-hidden">
				<div aria-hidden className="brnit-marquee-track flex">
					{TRACKS.map((track) => (
						<ul className="flex shrink-0 items-center gap-3 pe-3" key={track}>
							{copy.marquee.items.map((item) => (
								<li
									className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full bg-background/70 px-4 py-2 font-medium text-foreground/80 text-sm"
									key={item}
								>
									<span className="size-1.5 rounded-full bg-primary" />
									{item}
								</li>
							))}
						</ul>
					))}
				</div>
			</div>
		</section>
	);
}
