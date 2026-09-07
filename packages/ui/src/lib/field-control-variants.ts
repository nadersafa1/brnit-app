import { cva } from "class-variance-authority";

/**
 * The shared surface for every text-entry / value-picker control — `Input`,
 * `Textarea`, `SelectTrigger`, `ComboboxInput`.
 *
 * brnit's `design.json` asks for filled, floating controls rather than bordered
 * ones (`shape.stroke.default: "none"`, "use shadow + spacing instead"), so the
 * affordance is `bg-card` + `shadow-soft` on the blush canvas. There is
 * deliberately no `border-*` here.
 *
 * Contrast: `--ring` resolves to `--brand-focus-ring` (2px orange at 40%, per
 * `accessibility.states.focus`) and `--destructive` is a readable red, never an
 * accent fill.
 */
export const FIELD_CONTROL_BASE =
	"w-full min-w-0 bg-card text-foreground text-sm shadow-soft outline-none transition-[background-color,box-shadow] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-destructive/40";

/**
 * `size` follows `design.json`'s thumb-friendly control ladder
 * (`PrimaryButton.heightPx: 44`, `accessibility.minimumTouchTargetPx: 44`), so
 * `default` is 44px and never drops below the 36px `sm` step.
 *
 * `shape` is split out from `size` so a multi-line control can keep the height
 * ladder while opting out of the pill radius.
 */
export const fieldControlVariants = cva(FIELD_CONTROL_BASE, {
	variants: {
		size: {
			sm: "h-9 px-3.5",
			default: "h-11 px-4.5",
			lg: "h-12 px-5 text-base",
		},
		shape: {
			pill: "rounded-full",
			block: "rounded-lg",
		},
	},
	defaultVariants: {
		shape: "pill",
		size: "default",
	},
});
