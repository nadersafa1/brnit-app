import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@brnit/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

function Tabs({
	className,
	orientation = "horizontal",
	...props
}: TabsPrimitive.Root.Props) {
	return (
		<TabsPrimitive.Root
			className={cn(
				"group/tabs flex gap-4 data-horizontal:flex-col",
				className
			)}
			data-orientation={orientation}
			data-slot="tabs"
			{...props}
		/>
	);
}

/**
 * `default` is `design.json`'s segmented capsule track. `chrome` is the
 * bottom-navigation recipe (`components.BottomNavigation`): a dark pill track
 * whose active item becomes an accent pill — so inactive copy uses
 * `--chrome-muted` and the active pill pairs `--primary` with
 * `--primary-foreground` (`--brand-on-accent`), never `--foreground`.
 */
const tabsListVariants = cva(
	"group/tabs-list inline-flex w-fit items-center justify-center rounded-full p-1.5 group-data-horizontal/tabs:h-12 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
	{
		variants: {
			variant: {
				default: "bg-secondary text-muted-foreground",
				chrome: "bg-chrome text-chrome-muted shadow-float",
				line: "h-auto gap-2 rounded-none bg-transparent p-0 text-muted-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

function TabsList({
	className,
	variant = "default",
	...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
	return (
		<TabsPrimitive.List
			className={cn(tabsListVariants({ variant }), className)}
			data-slot="tabs-list"
			data-variant={variant}
			{...props}
		/>
	);
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
	return (
		<TabsPrimitive.Tab
			className={cn(
				"relative inline-flex h-9 flex-1 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent px-4 font-medium text-sm outline-none transition-all ease-standard focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start [&_svg:not([class*='size-'])]:size-5 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				"data-active:bg-card data-active:text-card-foreground data-active:shadow-soft",
				"group-data-[variant=chrome]/tabs-list:text-chrome-muted group-data-[variant=chrome]/tabs-list:data-active:bg-primary group-data-[variant=chrome]/tabs-list:data-active:text-primary-foreground",
				"group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:px-1 group-data-[variant=line]/tabs-list:pb-3 group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:text-foreground group-data-[variant=line]/tabs-list:data-active:shadow-none",
				"after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
				className
			)}
			data-slot="tabs-trigger"
			{...props}
		/>
	);
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
	return (
		<TabsPrimitive.Panel
			className={cn("flex-1 text-sm outline-none", className)}
			data-slot="tabs-content"
			{...props}
		/>
	);
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
