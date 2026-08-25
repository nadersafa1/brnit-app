import { isValidElement, type ReactNode } from "react";

/**
 * Flattens a `SelectItem`'s children down to plain text so `Select` can build
 * the `items` map Base UI needs to render a closed trigger's value without the
 * caller having to duplicate every label.
 *
 * Returns `undefined` rather than `""` for empty input so callers can use `??`.
 */
export function getTextFromSelectItemChildren(
	children: ReactNode
): string | undefined {
	if (children == null || typeof children === "boolean") {
		return;
	}
	if (typeof children === "string" || typeof children === "number") {
		return String(children);
	}
	if (Array.isArray(children)) {
		const text = children
			.map((child) => getTextFromSelectItemChildren(child))
			.filter(Boolean)
			.join("");
		return text || undefined;
	}
	if (isValidElement<{ children?: ReactNode }>(children)) {
		return getTextFromSelectItemChildren(children.props.children);
	}
}
