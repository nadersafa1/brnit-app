export const Colors = {
  light: {
    // Brand Colors
    accent: '#FD6E20',
    accentLight: '#FF8F50',
    pastelPurple: '#C9BEFA',

    // Neutral Colors
    ink: '#111111',
    muted: '#6B6B6B',
    subtle: '#3A3A3A',
    border: '#E8E8E8',
    surfaceAlt: '#F2F2F2',
    offWhite: '#F7F7F7',

    // Surface Colors
    appBg: '#FCE9E7',
    card: '#FFFFFF',
    navPill: '#0B0B0B',

    // Semantic Colors
    success: '#35C48B',
    warning: '#FFB020',
    danger: '#FF4D4F',
    info: '#2F80ED',

    // Base Colors
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },
  dark: {
    // Brand (slightly tuned for contrast on charcoal)
    accent: '#FF7A2E',
    accentLight: '#FF9A5C',
    pastelPurple: '#B8A9F0',

    // Neutrals — warm charcoal stack (matches light peach/coral family)
    ink: '#F4F2EF',
    muted: '#9A958F',
    subtle: '#6E6963',
    border: '#35312E',
    surfaceAlt: '#1B1A18',
    offWhite: '#0E0D0C',

    // Surfaces — clear steps: canvas → inset → raised card → floating nav
    appBg: '#121110',
    card: '#1E1D1B',
    navPill: '#2C2926',

    // Semantic — a bit brighter on dark for legibility
    success: '#3DD69A',
    warning: '#FFC14D',
    danger: '#FF6B6E',
    info: '#5B9EF5',

    // Base Colors
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },
} as const

export type ColorScheme = keyof typeof Colors
export type ColorName = keyof typeof Colors.light
/** Token map for one scheme; use with `useColors()` at runtime. */
export type ThemeColors = (typeof Colors)[ColorScheme]
