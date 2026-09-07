import { Input } from "@brnit/ui/components/input";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";

const SEARCH_DEBOUNCE_MS = 300;

interface DataTableSearchProps {
	label: string;
	onSearchChange: (value: string) => void;
	placeholder?: string;
	/** The committed value from the URL. Typing is local until the debounce fires. */
	value: string;
}

export function DataTableSearch({
	label,
	onSearchChange,
	placeholder,
	value,
}: Readonly<DataTableSearchProps>) {
	const [draft, setDraft] = useState(value);
	const debouncedDraft = useDebouncedValue(draft, SEARCH_DEBOUNCE_MS);

	// Back/forward and a cleared filter change the URL without touching the
	// input, so the field follows the committed value when it moves on its own.
	useEffect(() => {
		setDraft(value);
	}, [value]);

	// Commits the settled draft to the URL. The guard is what keeps this from
	// looping: once the navigation lands, `value` equals `debouncedDraft` and the
	// next run is a no-op, even though the effect re-runs on every render.
	useEffect(() => {
		if (debouncedDraft !== value) {
			onSearchChange(debouncedDraft);
		}
	}, [debouncedDraft, value, onSearchChange]);

	return (
		<div className="relative w-full sm:max-w-xs">
			<SearchIcon
				aria-hidden
				className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				aria-label={label}
				className="ps-9"
				onChange={(event) => setDraft(event.target.value)}
				placeholder={placeholder ?? label}
				type="search"
				value={draft}
			/>
		</div>
	);
}
