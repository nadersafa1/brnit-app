import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@brnit/ui/lib/utils";

function TooltipProvider({ ...props }: TooltipPrimitive.Provider.Props) {
	return <TooltipPrimitive.Provider data-slot="tooltip-provider" {...props} />;
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
	return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/**
 * The bubble is the always-dark chrome surface, so its copy must come from the
 * chrome pair (`--brand-chrome-fg` at 18.44:1) — `--foreground` would be
 * invisible on it in light mode.
 */
function TooltipContent({
	className,
	children,
	align = "center",
	side = "top",
	sideOffset = 8,
	...props
}: TooltipPrimitive.Popup.Props &
	Pick<TooltipPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Positioner
				align={align}
				className="isolate z-50"
				side={side}
				sideOffset={sideOffset}
			>
				<TooltipPrimitive.Popup
					className={cn(
						"data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 w-fit origin-(--transform-origin) text-balance rounded-md bg-chrome px-3 py-2 text-chrome-foreground text-xs shadow-float duration-(--default-transition-duration) ease-standard data-closed:animate-out data-open:animate-in",
						className
					)}
					data-slot="tooltip-content"
					{...props}
				>
					{children}
				</TooltipPrimitive.Popup>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
