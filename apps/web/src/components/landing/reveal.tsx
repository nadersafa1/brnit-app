import { cn } from "@brnit/ui/lib/utils";
import type { CSSProperties, ReactNode } from "react";

import { useInView } from "@/hooks/use-scroll-motion";

type RevealVariant = "fade" | "rise" | "scale";

interface RevealProps {
	children: ReactNode;
	className?: string;
	/** Stagger, in ms. Keep siblings under ~400ms total or the page feels slow. */
	delay?: number;
	style?: CSSProperties;
	variant?: RevealVariant;
}

const RESTING: Record<RevealVariant, string> = {
	fade: "opacity-0",
	rise: "translate-y-8 opacity-0 blur-[3px]",
	scale: "scale-[0.96] opacity-0",
};

/**
 * Reveals its children the first time they cross into the viewport, and never
 * again — a section that re-animates on the way back up reads as a glitch.
 *
 * Motion is CSS-only (one transition per element); the hook just flips a class,
 * so a page full of these still costs a single IntersectionObserver each and no
 * scroll work. `motion-reduce:` puts every element straight into its resting
 * state for anyone who asked for less movement.
 */
export function Reveal({
	children,
	className,
	delay = 0,
	style,
	variant = "rise",
}: RevealProps) {
	const [ref, inView] = useInView<HTMLDivElement>();

	return (
		<div
			className={cn(
				"transition-[opacity,transform,filter] duration-700 ease-emphasized will-change-transform motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100 motion-reduce:blur-none motion-reduce:transition-none",
				inView
					? "translate-y-0 scale-100 opacity-100 blur-none"
					: RESTING[variant],
				className
			)}
			ref={ref}
			style={{ transitionDelay: `${delay}ms`, ...style }}
		>
			{children}
		</div>
	);
}
