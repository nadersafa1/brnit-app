import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { Button } from "@brnit/ui/components/button";
import { Input } from "@brnit/ui/components/input";
import { Separator } from "@brnit/ui/components/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@brnit/ui/components/sheet";
import { Skeleton } from "@brnit/ui/components/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@brnit/ui/components/tooltip";
import { useIsMobile } from "@brnit/ui/hooks/use-mobile";
import { cn } from "@brnit/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";
import type * as React from "react";
import {
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

/**
 * Ported from brnit's current `apps/web/src/components/ui/sidebar.tsx`, off
 * Radix and onto `@base-ui/react`: every `asChild` is now a `render` prop, and
 * the mobile drawer uses the base-ui `Sheet`.
 *
 * Geometry follows `design.json` rather than shadcn's desk defaults — 44px
 * menu rows, 16px radii, elevation instead of hairlines.
 */
const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "17rem";
const SIDEBAR_WIDTH_MOBILE = "19rem";
const SIDEBAR_WIDTH_ICON = "3.5rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

interface SidebarContextValue {
	isMobile: boolean;
	open: boolean;
	openMobile: boolean;
	setOpen: (open: boolean) => void;
	setOpenMobile: (open: boolean) => void;
	state: "expanded" | "collapsed";
	toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebar() {
	const context = use(SidebarContext);
	if (!context) {
		throw new Error("useSidebar must be used within a SidebarProvider.");
	}
	return context;
}

function SidebarProvider({
	defaultOpen = true,
	open: openProp,
	onOpenChange: setOpenProp,
	className,
	style,
	children,
	...props
}: React.ComponentProps<"div"> & {
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const isMobile = useIsMobile();
	const [openMobile, setOpenMobile] = useState(false);
	const [internalOpen, setInternalOpen] = useState(defaultOpen);
	const open = openProp ?? internalOpen;

	const setOpen = useCallback(
		(value: boolean | ((current: boolean) => boolean)) => {
			const openState = typeof value === "function" ? value(open) : value;
			if (setOpenProp) {
				setOpenProp(openState);
			} else {
				setInternalOpen(openState);
			}
			document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
		},
		[open, setOpenProp]
	);

	const toggleSidebar = useCallback(() => {
		if (isMobile) {
			setOpenMobile((current) => !current);
			return;
		}
		setOpen((current) => !current);
	}, [isMobile, setOpen]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
				(event.metaKey || event.ctrlKey)
			) {
				event.preventDefault();
				toggleSidebar();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [toggleSidebar]);

	const state = open ? "expanded" : "collapsed";

	const contextValue = useMemo<SidebarContextValue>(
		() => ({
			isMobile,
			open,
			openMobile,
			setOpen,
			setOpenMobile,
			state,
			toggleSidebar,
		}),
		[isMobile, open, openMobile, setOpen, state, toggleSidebar]
	);

	return (
		<SidebarContext value={contextValue}>
			<TooltipProvider>
				<div
					className={cn(
						"group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
						className
					)}
					data-slot="sidebar-wrapper"
					style={
						{
							"--sidebar-width": SIDEBAR_WIDTH,
							"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
							...style,
						} as React.CSSProperties
					}
					{...props}
				>
					{children}
				</div>
			</TooltipProvider>
		</SidebarContext>
	);
}

function Sidebar({
	side = "left",
	variant = "sidebar",
	collapsible = "offcanvas",
	className,
	children,
	...props
}: React.ComponentProps<"div"> & {
	side?: "left" | "right";
	variant?: "sidebar" | "floating" | "inset";
	collapsible?: "offcanvas" | "icon" | "none";
}) {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

	if (collapsible === "none") {
		return (
			<div
				className={cn(
					"flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
					className
				)}
				data-slot="sidebar"
				{...props}
			>
				{children}
			</div>
		);
	}

	if (isMobile) {
		return (
			<Sheet onOpenChange={setOpenMobile} open={openMobile}>
				<SheetContent
					className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground"
					data-mobile="true"
					data-slot="sidebar"
					side={side}
					style={
						{
							"--sidebar-width": SIDEBAR_WIDTH_MOBILE,
						} as React.CSSProperties
					}
				>
					<SheetHeader className="sr-only">
						<SheetTitle>Sidebar</SheetTitle>
						<SheetDescription>Displays the mobile sidebar.</SheetDescription>
					</SheetHeader>
					<div className="flex h-full w-full flex-col">{children}</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<div
			className="group peer hidden text-sidebar-foreground md:block"
			data-collapsible={state === "collapsed" ? collapsible : ""}
			data-side={side}
			data-slot="sidebar"
			data-state={state}
			data-variant={variant}
		>
			<div
				className={cn(
					"relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-standard group-data-[collapsible=offcanvas]:w-0 group-data-[side=right]:rotate-180",
					variant === "floating" || variant === "inset"
						? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
						: "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
				)}
				data-slot="sidebar-gap"
			/>
			<div
				className={cn(
					"fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-standard md:flex",
					side === "left"
						? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
						: "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
					variant === "floating" || variant === "inset"
						? "p-3 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
						: "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
					className
				)}
				data-slot="sidebar-container"
				{...props}
			>
				<div
					className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-xl group-data-[variant=floating]:shadow-float"
					data-slot="sidebar-inner"
				>
					{children}
				</div>
			</div>
		</div>
	);
}

function SidebarTrigger({
	className,
	onClick,
	...props
}: React.ComponentProps<typeof Button>) {
	const { toggleSidebar } = useSidebar();

	return (
		<Button
			className={cn("size-10", className)}
			data-slot="sidebar-trigger"
			onClick={(event) => {
				onClick?.(event);
				toggleSidebar();
			}}
			size="icon-sm"
			variant="ghost"
			{...props}
		>
			<PanelLeftIcon />
			<span className="sr-only">Toggle Sidebar</span>
		</Button>
	);
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
	const { toggleSidebar } = useSidebar();

	return (
		<button
			aria-label="Toggle Sidebar"
			className={cn(
				"absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-standard after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
				"in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
				"group-data-[collapsible=offcanvas]:translate-x-0 hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:after:left-full",
				className
			)}
			data-slot="sidebar-rail"
			onClick={toggleSidebar}
			tabIndex={-1}
			title="Toggle Sidebar"
			type="button"
			{...props}
		/>
	);
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
	return (
		<main
			className={cn(
				"relative flex w-full flex-1 flex-col bg-background",
				"md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-3 md:peer-data-[variant=inset]:m-3 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-soft",
				className
			)}
			data-slot="sidebar-inset"
			{...props}
		/>
	);
}

function SidebarInput({
	className,
	...props
}: React.ComponentProps<typeof Input>) {
	return (
		<Input
			className={cn("h-10 w-full shadow-none", className)}
			data-slot="sidebar-input"
			size="sm"
			{...props}
		/>
	);
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-col gap-2 p-3", className)}
			data-slot="sidebar-header"
			{...props}
		/>
	);
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-col gap-2 p-3", className)}
			data-slot="sidebar-footer"
			{...props}
		/>
	);
}

function SidebarSeparator({
	className,
	...props
}: React.ComponentProps<typeof Separator>) {
	return (
		<Separator
			className={cn("mx-3 w-auto bg-sidebar-border", className)}
			data-slot="sidebar-separator"
			{...props}
		/>
	);
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
				className
			)}
			data-slot="sidebar-content"
			{...props}
		/>
	);
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("relative flex w-full min-w-0 flex-col p-3", className)}
			data-slot="sidebar-group"
			{...props}
		/>
	);
}

function SidebarGroupLabel({
	className,
	render,
	...props
}: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				className: cn(
					"flex h-9 shrink-0 items-center rounded-md px-3 font-medium text-sidebar-foreground/70 text-xs outline-hidden ring-sidebar-ring transition-[margin,opacity] duration-200 ease-standard focus-visible:ring-2 group-data-[collapsible=icon]:-mt-9 group-data-[collapsible=icon]:opacity-0 [&>svg]:size-4 [&>svg]:shrink-0",
					className
				),
			},
			props
		),
		render,
		state: { slot: "sidebar-group-label" },
	});
}

function SidebarGroupAction({
	className,
	render,
	...props
}: useRender.ComponentProps<"button">) {
	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				className: cn(
					"absolute top-4 right-4 flex aspect-square w-6 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-transform after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:hidden md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
					className
				),
			},
			props
		),
		render,
		state: { slot: "sidebar-group-action" },
	});
}

function SidebarGroupContent({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("w-full text-sm", className)}
			data-slot="sidebar-group-content"
			{...props}
		/>
	);
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
	return (
		<ul
			className={cn("flex w-full min-w-0 flex-col gap-1", className)}
			data-slot="sidebar-menu"
			{...props}
		/>
	);
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
	return (
		<li
			className={cn("group/menu-item relative", className)}
			data-slot="sidebar-menu-item"
			{...props}
		/>
	);
}

const sidebarMenuButtonVariants = cva(
	"peer/menu-button flex w-full items-center gap-3 overflow-hidden rounded-md px-3 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] ease-standard hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[slot=sidebar-menu-action]/menu-item:pr-10 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:bg-sidebar-accent data-popup-open:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! [&>span:last-child]:truncate [&>svg]:size-5 [&>svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "",
				outline: "bg-background shadow-soft hover:bg-sidebar-accent",
			},
			size: {
				default: "h-11 text-sm",
				sm: "h-9 text-xs",
				lg: "h-14 text-sm group-data-[collapsible=icon]:p-0!",
			},
		},
		defaultVariants: {
			size: "default",
			variant: "default",
		},
	}
);

function SidebarMenuButton({
	className,
	isActive = false,
	variant = "default",
	size = "default",
	tooltip,
	render,
	...props
}: useRender.ComponentProps<"button"> &
	VariantProps<typeof sidebarMenuButtonVariants> & {
		isActive?: boolean;
		tooltip?: string | React.ComponentProps<typeof TooltipContent>;
	}) {
	const { isMobile, state } = useSidebar();

	const button = useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				className: cn(sidebarMenuButtonVariants({ size, variant }), className),
			},
			props
		),
		render,
		state: { active: isActive, size, slot: "sidebar-menu-button" },
	});

	if (!tooltip) {
		return button;
	}

	const tooltipProps =
		typeof tooltip === "string" ? { children: tooltip } : tooltip;

	return (
		<Tooltip>
			<TooltipTrigger render={button} />
			{state === "collapsed" && !isMobile ? (
				<TooltipContent align="center" side="right" {...tooltipProps} />
			) : null}
		</Tooltip>
	);
}

function SidebarMenuAction({
	className,
	showOnHover = false,
	render,
	...props
}: useRender.ComponentProps<"button"> & {
	showOnHover?: boolean;
}) {
	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				className: cn(
					"absolute top-2 right-2 flex aspect-square w-7 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-transform after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
					showOnHover &&
						"group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-popup-open:opacity-100 peer-data-active/menu-button:text-sidebar-accent-foreground md:opacity-0",
					className
				),
			},
			props
		),
		render,
		state: { slot: "sidebar-menu-action" },
	});
}

function SidebarMenuBadge({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"pointer-events-none absolute right-2 flex h-6 min-w-6 select-none items-center justify-center rounded-full bg-sidebar-accent px-1.5 font-medium text-sidebar-accent-foreground text-xs tabular-nums group-data-[collapsible=icon]:hidden",
				className
			)}
			data-slot="sidebar-menu-badge"
			{...props}
		/>
	);
}

function SidebarMenuSkeleton({
	className,
	showIcon = false,
	...props
}: React.ComponentProps<"div"> & {
	showIcon?: boolean;
}) {
	// Random width between 50% and 90% so a loading list does not look striped.
	const width = useMemo(() => `${Math.floor(Math.random() * 40) + 50}%`, []);

	return (
		<div
			className={cn("flex h-11 items-center gap-3 rounded-md px-3", className)}
			data-slot="sidebar-menu-skeleton"
			{...props}
		>
			{showIcon ? <Skeleton className="size-5 rounded-md" /> : null}
			<Skeleton
				className="h-4 max-w-(--skeleton-width) flex-1"
				style={{ "--skeleton-width": width } as React.CSSProperties}
			/>
		</div>
	);
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
	return (
		<ul
			className={cn(
				"mx-4 flex min-w-0 translate-x-px flex-col gap-1 border-sidebar-border border-l px-3 py-1 group-data-[collapsible=icon]:hidden",
				className
			)}
			data-slot="sidebar-menu-sub"
			{...props}
		/>
	);
}

function SidebarMenuSubItem({
	className,
	...props
}: React.ComponentProps<"li">) {
	return (
		<li
			className={cn("group/menu-sub-item relative", className)}
			data-slot="sidebar-menu-sub-item"
			{...props}
		/>
	);
}

function SidebarMenuSubButton({
	className,
	size = "md",
	isActive = false,
	render,
	...props
}: useRender.ComponentProps<"a"> & {
	isActive?: boolean;
	size?: "sm" | "md";
}) {
	return useRender({
		defaultTagName: "a",
		props: mergeProps<"a">(
			{
				className: cn(
					"flex h-10 min-w-0 -translate-x-px items-center gap-3 overflow-hidden rounded-md px-3 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
					size === "sm" && "text-xs",
					size === "md" && "text-sm",
					className
				),
			},
			props
		),
		render,
		state: { active: isActive, size, slot: "sidebar-menu-sub-button" },
	});
}

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	sidebarMenuButtonVariants,
	useSidebar,
};
