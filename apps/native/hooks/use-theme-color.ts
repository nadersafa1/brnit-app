import { useColorScheme } from "react-native";
import { resolvePaletteScheme } from "@/lib/theme/resolve-palette-scheme";
import { type ColorName, Colors } from "@/theme/colors";
import { shadowsDark, shadowsLight } from "@/theme/shadows";

export function useThemeColor(
	colorName: ColorName,
	props?: { light?: string; dark?: string }
): string {
	const scheme = resolvePaletteScheme(useColorScheme());
	const colorFromProps = props?.[scheme];

	if (colorFromProps) {
		return colorFromProps;
	}

	return Colors[scheme][colorName];
}

export function useColors() {
	const scheme = resolvePaletteScheme(useColorScheme());
	return Colors[scheme];
}

export function useColorSchemeValue() {
	return resolvePaletteScheme(useColorScheme());
}

export function useShadows() {
	const scheme = useColorSchemeValue();
	return scheme === "dark" ? shadowsDark : shadowsLight;
}

export type { ShadowKey } from "@/theme/shadows";
