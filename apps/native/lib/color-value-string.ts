import type { ColorValue } from "react-native";

/**
 * `ColorValue` includes platform colors; vector icon `color` props expect a string.
 */
export function colorValueToString(
	value: ColorValue | undefined
): string | undefined {
	return typeof value === "string" ? value : undefined;
}
