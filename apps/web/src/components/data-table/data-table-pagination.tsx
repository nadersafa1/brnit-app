import type { PaginationMeta } from "@brnit/api";
import { PAGE_SIZE_OPTIONS } from "@brnit/api/pagination/offset";
import { Button } from "@brnit/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@brnit/ui/components/select";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface DataTablePaginationProps {
	/** Names the rows for screen readers: "25 of 130 food items". */
	itemLabel: string;
	onPageChange: (page: number) => void;
	onPerPageChange: (perPage: number) => void;
	pagination: PaginationMeta;
}

/**
 * Offset pagination controls. brnit's API pages by number, not by cursor, so
 * the control shows real page positions and the sizes the server accepts.
 */
export function DataTablePagination({
	itemLabel,
	onPageChange,
	onPerPageChange,
	pagination,
}: Readonly<DataTablePaginationProps>) {
	const { page, perPage, totalItems, totalPages } = pagination;
	const isFirstPage = page <= 1;
	const isLastPage = page >= totalPages;

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-muted-foreground text-sm">
				{totalItems === 0
					? `No ${itemLabel}`
					: `Page ${page} of ${Math.max(totalPages, 1)} · ${totalItems} ${itemLabel}`}
			</p>
			<div className="flex items-center gap-2">
				<Select
					items={PAGE_SIZE_OPTIONS.map((size) => ({
						label: String(size),
						value: size,
					}))}
					onValueChange={(value: number | null) => {
						if (value !== null) {
							onPerPageChange(value);
						}
					}}
					value={perPage}
				>
					<SelectTrigger aria-label="Rows per page" size="sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{PAGE_SIZE_OPTIONS.map((size) => (
							<SelectItem key={size} value={size}>
								{size}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					disabled={isFirstPage}
					onClick={() => onPageChange(page - 1)}
					size="icon-sm"
					variant="outline"
				>
					<ChevronLeftIcon aria-hidden />
					<span className="sr-only">Previous page</span>
				</Button>
				<Button
					disabled={isLastPage}
					onClick={() => onPageChange(page + 1)}
					size="icon-sm"
					variant="outline"
				>
					<ChevronRightIcon aria-hidden />
					<span className="sr-only">Next page</span>
				</Button>
			</div>
		</div>
	);
}
