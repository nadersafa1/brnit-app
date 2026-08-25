import type { ActivityIndicatorProps } from "react-native";
import { useColors } from "@/hooks/use-theme-color";
import { colorValueToString } from "@/lib/color-value-string";
import { getFlameIconDefaultColor } from "@/lib/flame-icon-default-color";
import type { ThemeColors } from "@/theme/colors";
import { FlameActivityIndicator } from "./flame-activity-indicator";

type SpinnerSize = "sm" | "md" | "lg";
type SpinnerVariant = "default" | "muted";

export interface SpinnerProps extends Omit<ActivityIndicatorProps, "size"> {
	glowTint?: string;
	innerScale?: number;
	innerTint?: string;
	outerTint?: string;
	size?: SpinnerSize;
	variant?: SpinnerVariant;
}

const SIZE_MAP: Record<SpinnerSize, number> = {
	sm: 20,
	md: 24,
	lg: 28,
};

interface FlamePalette {
	glow: string;
	inner: string;
	outer: string;
}

function getSpinnerPalette(
	variant: SpinnerVariant,
	colors: ThemeColors,
	baseFlame: string
): FlamePalette {
	if (variant === "muted") {
		return { outer: colors.muted, inner: colors.muted, glow: colors.muted };
	}
	return { outer: baseFlame, inner: baseFlame, glow: baseFlame };
}

/**
 * App-wide loading indicator: themed flame animation with optional variant presets.
 */
export function Spinner({
	size = "md",
	color,
	...props
}: Readonly<SpinnerProps>) {
	const colors = useColors();
	const baseFlame = getFlameIconDefaultColor(colors);
	const {
		variant = "default",
		outerTint,
		innerTint,
		glowTint,
		innerScale,
		...rest
	} = props;

	const palette = getSpinnerPalette(variant, colors, baseFlame);
	const resolvedColor = colorValueToString(color) ?? palette.outer;

	return (
		<FlameActivityIndicator
			color={resolvedColor}
			glowTint={glowTint ?? palette.glow}
			innerScale={innerScale}
			innerTint={innerTint ?? palette.inner}
			outerTint={outerTint ?? resolvedColor}
			size={SIZE_MAP[size]}
			{...rest}
		/>
	);
}
