import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@brnit/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Doubles as brnit's `Chip` (`design.json` -> `components.Chip`): capsule
 * radius, 14px horizontal padding, caption type.
 *
 * `chrome` is the spec's `Chip.states.selected` (near-black fill, light copy) —
 * it uses the chrome pair so the copy stays readable in both themes.
 * `accent` is the low-opacity orange wash with `--accent-fg` copy; an accent
 * FILL with ink copy would be 2.42:1 and is deliberately not offered.
 */
const badgeVariants = cva(
	"group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border border-transparent px-3.5 py-1.5 font-medium text-xs transition-all ease-standard focus-visible:ring-2 focus-visible:ring-ring aria-invalid:ring-2 aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3.5",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
				secondary:
					"bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
				surface: "bg-card text-card-foreground shadow-soft [a&]:hover:bg-card-alt",
				chrome: "bg-chrome text-chrome-foreground shadow-soft",
				accent: "bg-accent-soft text-accent-fg",
				outline: "border-border text-foreground [a&]:hover:bg-accent",
				destructive: "bg-destructive/10 text-destructive",
				ghost: "text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
				link: "text-accent-fg underline-offset-4 [a&]:hover:underline",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

function Badge({
	className,
	variant = "default",
	render,
	...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
	return useRender({
		defaultTagName: "span",
		props: mergeProps<"span">(
			{
				className: cn(badgeVariants({ variant }), className),
			},
			props
		),
		render,
		state: {
			slot: "badge",
			variant,
		},
	});
}

export { Badge, badgeVariants };
