import { useColorScheme } from "react-native";
import { resolvePaletteScheme } from "@/lib/theme/resolve-palette-scheme";
import { useThemePreferenceStore } from "@/store/theme-preference-store";

export type AppThemeName = "light" | "dark";

/**
 * Resolved appearance + actions. Preference may be "system"; `currentTheme` is always light or dark.
 */
export function useAppTheme() {
	const preference = useThemePreferenceStore((s) => s.preference);
	const setPreference = useThemePreferenceStore((s) => s.setPreference);
	const systemScheme = resolvePaletteScheme(useColorScheme());

	const currentTheme: AppThemeName =
		preference === "system" ? systemScheme : preference;

	const isLight = currentTheme === "light";
	const isDark = currentTheme === "dark";

	const toggleTheme = () => {
		setPreference(currentTheme === "light" ? "dark" : "light");
	};

	return {
		themePreference: preference,
		currentTheme,
		isLight,
		isDark,
		setTheme: setPreference,
		toggleTheme,
	};
}
