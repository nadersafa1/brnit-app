import { FontAwesome5 } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/ui/primary-button";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

import { openStoreUrl } from "./open-store-url";

interface Props {
	message: string;
	storeUrl: string;
}

/**
 * The hard stop, rendered *instead of* the navigator by `VersionGateProvider`.
 *
 * There is deliberately no close, no back and no dismiss: the only way out is
 * to update. Every colour comes from `useColors()` so the screen is correct in
 * both appearances — it is the one screen a user may be stuck on.
 */
export function UpdateBlockedScreen({ message, storeUrl }: Props) {
	const colors = useColors();
	const insets = useSafeAreaInsets();

	return (
		<View
			style={[
				styles.container,
				{
					backgroundColor: colors.appBg,
					paddingTop: insets.top + spacing[6],
					paddingBottom: insets.bottom + spacing[6],
				},
			]}
		>
			<View style={styles.content}>
				<View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
					<FontAwesome5
						color={colors.onAccent}
						name="cloud-download-alt"
						size={52}
					/>
				</View>

				<Text size="3xl" style={styles.title} weight="bold">
					Update Required
				</Text>

				<Text muted size="base" style={styles.message}>
					{message}
				</Text>
			</View>

			<View style={styles.footer}>
				<PrimaryButton onPress={() => openStoreUrl(storeUrl)} size="lg">
					Update Now
				</PrimaryButton>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: spacing[6],
	},
	content: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	iconCircle: {
		width: 120,
		height: 120,
		borderRadius: radii.pill,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: spacing[8],
	},
	title: {
		textAlign: "center",
		marginBottom: spacing[3],
	},
	message: {
		textAlign: "center",
	},
	footer: {
		paddingTop: spacing[4],
	},
});
