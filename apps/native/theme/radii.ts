export const radii = {
	none: 0,
	xs: 8,
	sm: 12,
	md: 16,
	lg: 20,
	xl: 24,
	"2xl": 28,
	pill: 9999,
} as const;

export type RadiiKey = keyof typeof radii;
