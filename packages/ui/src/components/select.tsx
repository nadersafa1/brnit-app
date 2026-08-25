import {
	Select as SelectPrimitive,
	type SelectRoot,
} from "@base-ui/react/select";
import { fieldControlVariants } from "@brnit/ui/lib/field-control-variants";
import { cn } from "@brnit/ui/lib/utils";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import type * as React from "react";
import {
	createContext,
	use,
	useCallback,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";

import { getTextFromSelectItemChildren } from "./select-item-label";

interface SelectItemEntry {
	label: React.ReactNode;
	value: unknown;
}

interface SelectItemRegistry {
	registerItem: (value: unknown, label: React.ReactNode) => void;
	skipRegistration: boolean;
}

const SelectItemRegistryContext = createContext<SelectItemRegistry | null>(
	null
);

function useSelectItemsRegistry(hasExplicitItems: boolean) {
	const [items, setItems] = useState<SelectItemEntry[]>([]);

	const registerItem = useCallback((value: unknown, label: React.ReactNode) => {
		setItems((current) => {
			const existingIndex = current.findIndex((entry) => entry.value === value);
			if (existingIndex >= 0) {
				if (current[existingIndex]?.label === label) {
					return current;
				}
				const next = [...current];
				next[existingIndex] = { label, value };
				return next;
			}
			return [...current, { label, value }];
		});
	}, []);

	const registry = useMemo(
		() => ({ registerItem, skipRegistration: hasExplicitItems }),
		[hasExplicitItems, registerItem]
	);

	return { items, registry };
}

function Select<Value, Multiple extends boolean | undefined = false>(
	props: Readonly<SelectRoot.Props<Value, Multiple>>
) {
	const { items: itemsProp, ...rest } = props;
	const hasExplicitItems = itemsProp != null;
	const { items: registeredItems, registry } =
		useSelectItemsRegistry(hasExplicitItems);
	const items =
		itemsProp ?? (registeredItems.length > 0 ? registeredItems : undefined);

	return (
		<SelectItemRegistryContext value={registry}>
			<SelectPrimitive.Root items={items} {...rest} />
		</SelectItemRegistryContext>
	);
}

function SelectGroup({
	className,
	...props
}: Readonly<SelectPrimitive.Group.Props>) {
	return (
		<SelectPrimitive.Group
			className={cn("scroll-my-1", className)}
			data-slot="select-group"
			{...props}
		/>
	);
}

function SelectValue({
	className,
	...props
}: Readonly<SelectPrimitive.Value.Props>) {
	return (
		<SelectPrimitive.Value
			className={cn("flex flex-1 truncate text-left", className)}
			data-slot="select-value"
			{...props}
		/>
	);
}

function SelectTrigger({
	className,
	size = "default",
	children,
	...props
}: SelectPrimitive.Trigger.Props & {
	size?: "sm" | "default" | "lg";
}) {
	return (
		<SelectPrimitive.Trigger
			className={cn(
				fieldControlVariants({ size }),
				"flex select-none items-center justify-between gap-2 whitespace-nowrap data-placeholder:text-muted-foreground *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg:not([class*='size-'])]:size-5 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			data-size={size}
			data-slot="select-trigger"
			{...props}
		>
			{children}
			<SelectPrimitive.Icon
				render={
					<ChevronDownIcon className="pointer-events-none size-5 shrink-0 text-muted-foreground" />
				}
			/>
		</SelectPrimitive.Trigger>
	);
}

function SelectContent({
	className,
	children,
	side = "bottom",
	sideOffset = 8,
	align = "center",
	alignOffset = 0,
	alignItemWithTrigger = false,
	...props
}: SelectPrimitive.Popup.Props &
	Pick<
		SelectPrimitive.Positioner.Props,
		"align" | "alignItemWithTrigger" | "alignOffset" | "side" | "sideOffset"
	>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Positioner
				align={align}
				alignItemWithTrigger={alignItemWithTrigger}
				alignOffset={alignOffset}
				className="isolate z-50"
				side={side}
				sideOffset={sideOffset}
			>
				<SelectPrimitive.Popup
					className={cn(
						"data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-44 origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-xl bg-popover p-1.5 text-popover-foreground shadow-float duration-(--default-transition-duration) ease-standard data-[align-trigger=true]:animate-none data-closed:animate-out data-open:animate-in",
						className
					)}
					data-align-trigger={alignItemWithTrigger}
					data-slot="select-content"
					{...props}
				>
					<SelectScrollUpButton />
					<SelectPrimitive.List>{children}</SelectPrimitive.List>
					<SelectScrollDownButton />
				</SelectPrimitive.Popup>
			</SelectPrimitive.Positioner>
		</SelectPrimitive.Portal>
	);
}

function SelectLabel({
	className,
	...props
}: Readonly<SelectPrimitive.GroupLabel.Props>) {
	return (
		<SelectPrimitive.GroupLabel
			className={cn(
				"px-3 py-2 font-medium text-muted-foreground text-xs",
				className
			)}
			data-slot="select-label"
			{...props}
		/>
	);
}

function SelectItem({
	className,
	children,
	label,
	value,
	...props
}: Readonly<SelectPrimitive.Item.Props>) {
	const registry = use(SelectItemRegistryContext);

	useLayoutEffect(() => {
		if (!registry || registry.skipRegistration || value === undefined) {
			return;
		}
		const resolvedLabel = label ?? getTextFromSelectItemChildren(children);
		if (resolvedLabel != null && resolvedLabel !== "") {
			registry.registerItem(value, resolvedLabel);
		}
	}, [registry, value, label, children]);

	return (
		<SelectPrimitive.Item
			className={cn(
				"relative flex w-full cursor-default select-none items-center gap-2.5 rounded-lg py-2.5 pr-9 pl-3 text-sm outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			data-slot="select-item"
			label={label}
			value={value}
			{...props}
		>
			<SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
				{children}
			</SelectPrimitive.ItemText>
			<SelectPrimitive.ItemIndicator
				render={
					<span className="pointer-events-none absolute right-3 flex size-4 items-center justify-center text-accent-fg" />
				}
			>
				<CheckIcon className="pointer-events-none" />
			</SelectPrimitive.ItemIndicator>
		</SelectPrimitive.Item>
	);
}

function SelectSeparator({
	className,
	...props
}: Readonly<SelectPrimitive.Separator.Props>) {
	return (
		<SelectPrimitive.Separator
			className={cn(
				"pointer-events-none -mx-1.5 my-1.5 h-px bg-border",
				className
			)}
			data-slot="select-separator"
			{...props}
		/>
	);
}

function SelectScrollUpButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
	return (
		<SelectPrimitive.ScrollUpArrow
			className={cn(
				"top-0 z-10 flex w-full cursor-default items-center justify-center rounded-t-xl bg-popover py-1.5 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			data-slot="select-scroll-up-button"
			{...props}
		>
			<ChevronUpIcon />
		</SelectPrimitive.ScrollUpArrow>
	);
}

function SelectScrollDownButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
	return (
		<SelectPrimitive.ScrollDownArrow
			className={cn(
				"bottom-0 z-10 flex w-full cursor-default items-center justify-center rounded-b-xl bg-popover py-1.5 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			data-slot="select-scroll-down-button"
			{...props}
		>
			<ChevronDownIcon />
		</SelectPrimitive.ScrollDownArrow>
	);
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
};
