import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { fieldControlVariants } from "@brnit/ui/lib/field-control-variants";
import { cn } from "@brnit/ui/lib/utils";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";

/**
 * Replaces brnit's cmdk + Radix Popover combobox
 * (`apps/web/src/components/ui/combobox/base-combobox.tsx`) with the
 * `@base-ui/react` primitive: filtering, async item lists, single and multiple
 * selection and the chip surface all come from the primitive, so the app-side
 * `useCombobox` hook no longer has to own list/highlight/keyboard state.
 *
 * `ComboboxEmpty` and `ComboboxStatus` cover the old empty / loading / error
 * branches; `ComboboxChips` covers `mode: "multi"`.
 */
function Combobox<Value, Multiple extends boolean | undefined = false>({
	...props
}: ComboboxPrimitive.Root.Props<Value, Multiple>) {
	return <ComboboxPrimitive.Root data-slot="combobox" {...props} />;
}

function ComboboxInput({
	className,
	size = "default",
	...props
}: ComboboxPrimitive.Input.Props & {
	size?: "sm" | "default" | "lg";
}) {
	return (
		<ComboboxPrimitive.Input
			className={cn(fieldControlVariants({ size }), className)}
			data-size={size}
			data-slot="combobox-input"
			{...props}
		/>
	);
}

function ComboboxTrigger({
	className,
	children,
	...props
}: ComboboxPrimitive.Trigger.Props) {
	return (
		<ComboboxPrimitive.Trigger
			className={cn(
				fieldControlVariants(),
				"flex select-none items-center justify-between gap-2 text-left data-placeholder:text-muted-foreground [&_svg:not([class*='size-'])]:size-5 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			data-slot="combobox-trigger"
			{...props}
		>
			{children}
			<ComboboxPrimitive.Icon
				render={
					<ChevronsUpDownIcon className="pointer-events-none size-5 shrink-0 text-muted-foreground" />
				}
			/>
		</ComboboxPrimitive.Trigger>
	);
}

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
	return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxClear({
	className,
	children,
	...props
}: ComboboxPrimitive.Clear.Props) {
	return (
		<ComboboxPrimitive.Clear
			className={cn(
				"inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
				className
			)}
			data-slot="combobox-clear"
			{...props}
		>
			{children ?? (
				<>
					<XIcon className="size-4" />
					<span className="sr-only">Clear selection</span>
				</>
			)}
		</ComboboxPrimitive.Clear>
	);
}

function ComboboxContent({
	className,
	children,
	align = "start",
	alignOffset = 0,
	side = "bottom",
	sideOffset = 8,
	...props
}: ComboboxPrimitive.Popup.Props &
	Pick<
		ComboboxPrimitive.Positioner.Props,
		"align" | "alignOffset" | "side" | "sideOffset"
	>) {
	return (
		<ComboboxPrimitive.Portal>
			<ComboboxPrimitive.Positioner
				align={align}
				alignOffset={alignOffset}
				className="isolate z-50"
				side={side}
				sideOffset={sideOffset}
			>
				<ComboboxPrimitive.Popup
					className={cn(
						"data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 z-50 max-h-(--available-height) w-(--anchor-width) min-w-52 origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-xl bg-popover p-1.5 text-popover-foreground shadow-float outline-hidden duration-(--default-transition-duration) ease-standard data-closed:animate-out data-open:animate-in",
						className
					)}
					data-slot="combobox-content"
					{...props}
				>
					{children}
				</ComboboxPrimitive.Popup>
			</ComboboxPrimitive.Positioner>
		</ComboboxPrimitive.Portal>
	);
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
	return (
		<ComboboxPrimitive.List
			className={cn("flex flex-col", className)}
			data-slot="combobox-list"
			{...props}
		/>
	);
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
	return (
		<ComboboxPrimitive.Group
			className={cn("scroll-my-1", className)}
			data-slot="combobox-group"
			{...props}
		/>
	);
}

function ComboboxGroupLabel({
	className,
	...props
}: ComboboxPrimitive.GroupLabel.Props) {
	return (
		<ComboboxPrimitive.GroupLabel
			className={cn(
				"px-3 py-2 font-medium text-muted-foreground text-xs",
				className
			)}
			data-slot="combobox-group-label"
			{...props}
		/>
	);
}

function ComboboxItem({
	className,
	children,
	...props
}: ComboboxPrimitive.Item.Props) {
	return (
		<ComboboxPrimitive.Item
			className={cn(
				"relative flex w-full cursor-default select-none items-center gap-2.5 rounded-lg py-2.5 pr-9 pl-3 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			data-slot="combobox-item"
			{...props}
		>
			{children}
			<ComboboxPrimitive.ItemIndicator
				render={
					<span className="pointer-events-none absolute right-3 flex size-4 items-center justify-center text-accent-fg" />
				}
			>
				<CheckIcon className="pointer-events-none" />
			</ComboboxPrimitive.ItemIndicator>
		</ComboboxPrimitive.Item>
	);
}

function ComboboxSeparator({
	className,
	...props
}: ComboboxPrimitive.Separator.Props) {
	return (
		<ComboboxPrimitive.Separator
			className={cn(
				"pointer-events-none -mx-1.5 my-1.5 h-px bg-border",
				className
			)}
			data-slot="combobox-separator"
			{...props}
		/>
	);
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
	return (
		<ComboboxPrimitive.Empty
			className={cn(
				"px-4 py-8 text-center text-muted-foreground text-sm",
				className
			)}
			data-slot="combobox-empty"
			{...props}
		/>
	);
}

/** Live region for async list state — the old "Searching…" / error branches. */
function ComboboxStatus({
	className,
	...props
}: ComboboxPrimitive.Status.Props) {
	return (
		<ComboboxPrimitive.Status
			className={cn(
				"flex items-center justify-center gap-2 px-4 py-6 text-muted-foreground text-sm",
				className
			)}
			data-slot="combobox-status"
			{...props}
		/>
	);
}

function ComboboxChips({ className, ...props }: ComboboxPrimitive.Chips.Props) {
	return (
		<ComboboxPrimitive.Chips
			className={cn(
				"flex min-h-11 w-full flex-wrap items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-soft focus-within:ring-2 focus-within:ring-ring",
				className
			)}
			data-slot="combobox-chips"
			{...props}
		/>
	);
}

function ComboboxChip({ className, ...props }: ComboboxPrimitive.Chip.Props) {
	return (
		<ComboboxPrimitive.Chip
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground text-xs",
				className
			)}
			data-slot="combobox-chip"
			{...props}
		/>
	);
}

function ComboboxChipRemove({
	className,
	children,
	...props
}: ComboboxPrimitive.ChipRemove.Props) {
	return (
		<ComboboxPrimitive.ChipRemove
			className={cn(
				"-mr-1 inline-flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
				className
			)}
			data-slot="combobox-chip-remove"
			{...props}
		>
			{children ?? <XIcon className="size-3" />}
		</ComboboxPrimitive.ChipRemove>
	);
}

export {
	Combobox,
	ComboboxChip,
	ComboboxChipRemove,
	ComboboxChips,
	ComboboxClear,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxGroupLabel,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxSeparator,
	ComboboxStatus,
	ComboboxTrigger,
	ComboboxValue,
};
