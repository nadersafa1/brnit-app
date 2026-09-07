import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { cn } from "@brnit/ui/lib/utils";
import { ChevronDownIcon } from "lucide-react";

/**
 * brnit renders accordion items as separated cards rather than a bordered
 * stack — `design.json` groups with elevation and whitespace, not hairlines.
 */
function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
	return (
		<AccordionPrimitive.Root
			className={cn("flex w-full flex-col gap-3", className)}
			data-slot="accordion"
			{...props}
		/>
	);
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
	return (
		<AccordionPrimitive.Item
			className={cn(
				"overflow-hidden rounded-lg bg-card px-4 text-card-foreground shadow-soft",
				className
			)}
			data-slot="accordion-item"
			{...props}
		/>
	);
}

function AccordionTrigger({
	className,
	children,
	...props
}: AccordionPrimitive.Trigger.Props) {
	return (
		<AccordionPrimitive.Header className="flex">
			<AccordionPrimitive.Trigger
				className={cn(
					"group/accordion-trigger flex flex-1 items-center justify-between gap-4 rounded-md py-4 text-left font-medium text-sm outline-none transition-all ease-standard focus-visible:ring-2 focus-visible:ring-ring aria-disabled:pointer-events-none aria-disabled:opacity-50",
					className
				)}
				data-slot="accordion-trigger"
				{...props}
			>
				{children}
				<ChevronDownIcon
					className="pointer-events-none size-5 shrink-0 text-muted-foreground transition-transform duration-(--default-transition-duration) ease-standard group-aria-expanded/accordion-trigger:rotate-180"
					data-slot="accordion-trigger-icon"
				/>
			</AccordionPrimitive.Trigger>
		</AccordionPrimitive.Header>
	);
}

function AccordionContent({
	className,
	children,
	...props
}: AccordionPrimitive.Panel.Props) {
	return (
		<AccordionPrimitive.Panel
			className="overflow-hidden text-sm data-closed:animate-accordion-up data-open:animate-accordion-down"
			data-slot="accordion-content"
			{...props}
		>
			<div
				className={cn(
					"h-(--accordion-panel-height) pt-0 pb-4 text-muted-foreground leading-relaxed data-ending-style:h-0 data-starting-style:h-0 [&_a]:text-accent-fg [&_a]:underline [&_a]:underline-offset-4 [&_p:not(:last-child)]:mb-4",
					className
				)}
			>
				{children}
			</div>
		</AccordionPrimitive.Panel>
	);
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
