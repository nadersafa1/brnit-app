import { cn } from "@brnit/ui/lib/utils";
import type * as React from "react";

/**
 * `design.json` -> `components.Card`: white surface on the blush canvas, 20px
 * radius, 16px padding, soft blurred elevation and **no border** — the spec is
 * explicit that grouping comes from elevation and whitespace
 * (`elevation.guidelines`, `implementationNotesForAI.commonMistakesToAvoid`).
 *
 * `size="feature"` is the spec's `Card.variants.feature` / `analytics`: 24px
 * radius, roomier padding and a stronger float.
 */
function Card({
	className,
	size = "default",
	...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" | "feature" }) {
	return (
		<div
			className={cn(
				"group/card flex flex-col gap-4 overflow-hidden rounded-lg bg-card py-4 text-card-foreground text-sm shadow-soft has-[>img:first-child]:pt-0 data-[size=feature]:gap-5 data-[size=sm]:gap-3 data-[size=feature]:rounded-xl data-[size=sm]:rounded-md data-[size=feature]:py-6 data-[size=sm]:py-3 data-[size=feature]:shadow-float",
				className
			)}
			data-size={size}
			data-slot="card"
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] group-data-[size=feature]/card:px-6 group-data-[size=sm]/card:px-3.5 [.border-b]:pb-4",
				className
			)}
			data-slot="card-header"
			{...props}
		/>
	);
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"font-semibold text-lg leading-tight tracking-tight group-data-[size=feature]/card:text-xl group-data-[size=sm]/card:text-base",
				className
			)}
			data-slot="card-title"
			{...props}
		/>
	);
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("text-muted-foreground text-sm leading-relaxed", className)}
			data-slot="card-description"
			{...props}
		/>
	);
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"col-start-2 row-span-2 row-start-1 self-start justify-self-end",
				className
			)}
			data-slot="card-action"
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"px-4 group-data-[size=feature]/card:px-6 group-data-[size=sm]/card:px-3.5",
				className
			)}
			data-slot="card-content"
			{...props}
		/>
	);
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex items-center gap-3 px-4 group-data-[size=feature]/card:px-6 group-data-[size=sm]/card:px-3.5 [.border-t]:pt-4",
				className
			)}
			data-slot="card-footer"
			{...props}
		/>
	);
}

export {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
};
