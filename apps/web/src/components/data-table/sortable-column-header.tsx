import type { SortOrder } from "@brnit/api";
import { TableHead } from "@brnit/ui/components/table";
import { cn } from "@brnit/ui/lib/utils";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";

interface SortableColumnHeaderProps<TSortBy extends string> {
	align?: "end" | "start";
	className?: string;
	column: TSortBy;
	label: string;
	onSortChange: (column: TSortBy, order: SortOrder) => void;
	sortBy: TSortBy;
	sortOrder: SortOrder;
}

/**
 * A `<th>` whose label is a real button, with `aria-sort` on the cell so the
 * current column and direction are announced rather than only drawn.
 *
 * Clicking the active column flips the direction; clicking a new one starts at
 * `asc`, which is what a reader expects the first time they sort by a name.
 */
export function SortableColumnHeader<TSortBy extends string>({
	align = "start",
	className,
	column,
	label,
	onSortChange,
	sortBy,
	sortOrder,
}: Readonly<SortableColumnHeaderProps<TSortBy>>) {
	const isActive = sortBy === column;
	const nextOrder: SortOrder = isActive && sortOrder === "asc" ? "desc" : "asc";

	let ariaSort: "ascending" | "descending" | "none" = "none";
	if (isActive) {
		ariaSort = sortOrder === "asc" ? "ascending" : "descending";
	}

	let SortIcon = ArrowUpDownIcon;
	if (isActive) {
		SortIcon = sortOrder === "asc" ? ArrowUpIcon : ArrowDownIcon;
	}

	return (
		<TableHead aria-sort={ariaSort} className={className}>
			<button
				className={cn(
					"inline-flex cursor-pointer items-center gap-1.5 rounded-md outline-offset-2 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand-accent",
					align === "end" && "flex-row-reverse",
					isActive && "text-foreground"
				)}
				onClick={() => onSortChange(column, nextOrder)}
				type="button"
			>
				{label}
				<SortIcon aria-hidden className="size-3.5 opacity-70" />
			</button>
		</TableHead>
	);
}
