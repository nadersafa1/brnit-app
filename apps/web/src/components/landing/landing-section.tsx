import { cn } from "@brnit/ui/lib/utils";
import type { ReactNode } from "react";

import { Reveal } from "./reveal";

/**
 * The page's horizontal rhythm. Every band shares this container so the left
 * edge of a heading lines up from the hero to the footer, at every width.
 */
export function LandingContainer({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("mx-auto w-full max-w-[76rem] px-5 sm:px-8", className)}>
			{children}
		</div>
	);
}

export function Eyebrow({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"brnit-eyebrow inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 font-semibold text-[0.7rem] text-accent-fg uppercase shadow-soft",
				className
			)}
		>
			<span className="size-1.5 rounded-full bg-primary" />
			{children}
		</span>
	);
}

interface SectionHeadingProps {
	align?: "centre" | "start";
	eyebrow: string;
	subtitle?: string;
	title: ReactNode;
}

export function SectionHeading({
	align = "centre",
	eyebrow,
	subtitle,
	title,
}: SectionHeadingProps) {
	return (
		<Reveal
			className={cn(
				"flex flex-col gap-5",
				align === "centre"
					? "items-center text-center"
					: "items-start text-start"
			)}
		>
			<Eyebrow>{eyebrow}</Eyebrow>
			<h2 className="max-w-3xl text-balance font-bold text-[clamp(1.85rem,4.4vw,3.05rem)] leading-[1.08] tracking-tight">
				{title}
			</h2>
			{subtitle ? (
				<p className="max-w-2xl text-pretty text-base text-muted-foreground leading-relaxed sm:text-lg">
					{subtitle}
				</p>
			) : null}
		</Reveal>
	);
}

interface LandingSectionProps {
	children: ReactNode;
	className?: string;
	id?: string;
}

export function LandingSection({
	children,
	className,
	id,
}: LandingSectionProps) {
	return (
		<section
			className={cn("relative py-20 sm:py-24 lg:py-28", className)}
			id={id}
		>
			{children}
		</section>
	);
}
