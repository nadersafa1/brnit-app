import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@brnit/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Pill-shaped, thumb-friendly buttons per `design.json`:
 * `PrimaryButton.shape: "pill"`, `heightPx: 44`, `paddingX_Px: 18`, and a
 * `scale(0.98)` press. Depth is a soft blurred shadow, never a hard outline.
 *
 * Contrast rules baked in (see `@brnit/brand`):
 *   - `default` fills with `--primary` (`--brand-accent`) and can therefore only
 *     use `--primary-foreground` (`--brand-on-accent`) for copy.
 *   - `link` is the only accent-COLOURED variant and uses `--accent-fg`
 *     (`--brand-accent-fg`); `text-primary` would be 2.42:1 and is never used.
 *   - `chrome` sits on the always-dark nav surface and pairs `--chrome` with
 *     `--chrome-foreground` (`--brand-chrome-fg`), never `--foreground`.
 */
const buttonVariants = cva(
	"group/button inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent bg-clip-padding font-medium text-sm outline-none transition-all ease-standard focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-5 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground shadow-soft hover:bg-primary/90",
				secondary: "bg-card text-card-foreground shadow-soft hover:bg-card-alt",
				outline:
					"border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent",
				ghost:
					"text-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent",
				chrome:
					"bg-chrome text-chrome-foreground shadow-float hover:bg-chrome/90",
				destructive:
					"bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:ring-destructive/40",
				link: "text-accent-fg underline-offset-4 hover:underline",
			},
			size: {
				default: "h-11 px-4.5 has-[>svg]:px-4",
				xs: "h-8 gap-1.5 px-3 text-xs has-[>svg]:px-2.5 [&_svg:not([class*='size-'])]:size-4",
				sm: "h-9 gap-1.5 px-4 has-[>svg]:px-3 [&_svg:not([class*='size-'])]:size-4",
				lg: "h-12 px-6 text-base has-[>svg]:px-5",
				icon: "size-11",
				"icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-4",
				"icon-sm": "size-10",
				"icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-6",
			},
		},
		defaultVariants: {
			size: "default",
			variant: "default",
		},
	}
);

function Button({
	className,
	variant = "default",
	size = "default",
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			className={cn(buttonVariants({ className, size, variant }))}
			data-size={size}
			data-slot="button"
			data-variant={variant}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
