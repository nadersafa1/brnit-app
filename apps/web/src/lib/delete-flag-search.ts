import type { SearchSchemaInput } from "@tanstack/react-router";

/**
 * `validateSearch` for the detail routes that can be deep-linked straight into
 * their delete confirmation.
 *
 * The pre-overhaul screens linked the list's "Delete" row action at
 * `…/{id}?delete=1` rather than confirming in place, so the dialog opens on a
 * route that also works when pasted, bookmarked or reached with the back
 * button. `1` is still accepted so every existing link keeps working; the app's
 * own navigations pass a boolean, which serialises as `?delete=true`.
 */

export interface DeleteFlagSearch {
	delete: boolean;
}

const TRUTHY_FLAGS: readonly unknown[] = [true, 1, "1", "true"];

export function parseDeleteFlagSearch(
	search: Record<string, unknown> & SearchSchemaInput
): DeleteFlagSearch {
	return { delete: TRUTHY_FLAGS.includes(search.delete) };
}
