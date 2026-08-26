import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";

/** Storage key shared with the blocking script in `index.html`. Keep them in sync. */
export const THEME_STORAGE_KEY = "brnit-ui-theme";

export function ThemeProvider({
	children,
	...props
}: React.ComponentProps<typeof NextThemesProvider>) {
	return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
