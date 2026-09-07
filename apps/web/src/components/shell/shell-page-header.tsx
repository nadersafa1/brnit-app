import type { ReactNode } from "react";

import { SHELL_PAGE_TITLE_CLASS } from "@/components/shell/shell-page-width";

interface ShellPageHeaderProps {
	actions?: ReactNode;
	description?: ReactNode;
	eyebrow?: string;
	title: string;
}

/**
 * The **only** `<h1>` on a dashboard screen. Pages never write their own
 * heading, which is what keeps one page one heading and the document outline
 * honest for screen readers.
 */
export function ShellPageHeader({
	actions,
	description,
	eyebrow,
	title,
}: Readonly<ShellPageHeaderProps>) {
	return (
		<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0 space-y-1">
				{eyebrow ? (
					<p className="font-medium text-muted-foreground text-xs tracking-wide">
						{eyebrow}
					</p>
				) : null}
				<h1 className={SHELL_PAGE_TITLE_CLASS}>{title}</h1>
				{description ? (
					<div className="mt-1 max-w-2xl text-muted-foreground text-sm">
						{description}
					</div>
				) : null}
			</div>
			{actions ? (
				<div className="flex shrink-0 flex-wrap items-center gap-2">
					{actions}
				</div>
			) : null}
		</header>
	);
}
