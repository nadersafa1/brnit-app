import { useEffect, useState } from "react";

/**
 * Trails `value` by `delayMs`.
 *
 * Used for search inputs: the typed value stays instant in the field while the
 * URL — and therefore the query — only follows once typing pauses, so a
 * five-letter search is one request rather than five.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timeout = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timeout);
	}, [value, delayMs]);

	return debounced;
}
