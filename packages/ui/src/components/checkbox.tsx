import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "@brnit/ui/lib/utils";
import { CheckIcon } from "lucide-react";

/**
 * 20px box with an `after:` hit area that reaches the 44px minimum touch target
 * from `design.json` -> `accessibility.minimumTouchTargetPx` without changing
 * the visual size.
 */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
	return (
		<CheckboxPrimitive.Root
			className={cn(
				"peer relative flex size-5 shrink-0 items-center justify-center rounded-xs bg-card shadow-soft outline-none transition-colors after:absolute after:-inset-x-3 after:-inset-y-3 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 group-has-disabled/field:opacity-50 aria-invalid:ring-2 aria-invalid:ring-destructive/40 data-checked:bg-primary data-checked:text-primary-foreground",
				className
			)}
			data-slot="checkbox"
			{...props}
		>
			<CheckboxPrimitive.Indicator
				className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
				data-slot="checkbox-indicator"
			>
				<CheckIcon />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
