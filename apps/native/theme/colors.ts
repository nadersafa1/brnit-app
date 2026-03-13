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
    // Brand Colors
    accent: '#FD6E20',
    accentLight: '#FF8F50',
    pastelPurple: '#C9BEFA',

    // Neutral Colors (inverted for dark mode)
    ink: '#F7F7F7',
    muted: '#A0A0A0',
    subtle: '#CCCCCC',
    border: '#3A3A3A',
    surfaceAlt: '#1A1A1A',
    offWhite: '#111111',

    // Surface Colors
    appBg: '#0A0A0A',
    card: '#1A1A1A',
    navPill: '#1A1A1A',

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
} as const

export type ColorScheme = keyof typeof Colors
export type ColorName = keyof typeof Colors.light
