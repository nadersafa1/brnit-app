import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { useShadows } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

interface AuthSocialIconButtonsProps {
	cardBackgroundColor: string;
	iconMutedColor: string;
	isLoading: boolean;
	onApplePress?: () => void;
	onGooglePress: () => void;
	/** When false, only the Google control is shown (same layout). */
	showApple: boolean;
}

/**
 * Social OAuth icon row for auth screens (Google + optional Apple on iOS).
 */
export function AuthSocialIconButtons({
	isLoading,
	cardBackgroundColor,
	iconMutedColor,
	onGooglePress,
	onApplePress,
	showApple,
}: Readonly<AuthSocialIconButtonsProps>) {
	const elevation = useShadows();

	return (
		<View style={styles.socialButtons}>
			<TouchableOpacity
				disabled={isLoading}
				onPress={onGooglePress}
				style={[
					styles.socialButton,
					{ backgroundColor: cardBackgroundColor },
					elevation.md,
				]}
			>
				<Ionicons color={iconMutedColor} name="logo-google" size={20} />
			</TouchableOpacity>

			{showApple && onApplePress ? (
				<TouchableOpacity
					disabled={isLoading}
					onPress={onApplePress}
					style={[
						styles.socialButton,
						{ backgroundColor: cardBackgroundColor },
						elevation.md,
					]}
				>
					<Ionicons color={iconMutedColor} name="logo-apple" size={20} />
				</TouchableOpacity>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	socialButtons: {
		flexDirection: "row",
		gap: spacing[3],
		marginTop: spacing[2],
	},
	socialButton: {
		flex: 1,
		height: 44,
		borderRadius: radii.pill,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: spacing[4],
	},
});
