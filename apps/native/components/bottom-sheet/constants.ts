/**
 * Shared configuration for app bottom sheets.
 * Use DEFAULT_SNAP_POINTS unless a sheet needs dynamic sizing (e.g. dynamic content height).
 */
export const DEFAULT_SNAP_POINTS = ["50%", "60%", "70%", "80%"] as const;

export type DefaultSnapPointIndex = 0 | 1 | 2 | 3;
