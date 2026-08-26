import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

function handleClose() {
	router.back();
}

function Modal() {
	const colors = useColors();

	return (
		<Container>
			<View style={styles.content}>
				<Surface
					padding={5}
					radius="sm"
					style={styles.surface}
					variant="secondary"
				>
					<View style={styles.iconContainer}>
						<View
							style={[styles.iconCircle, { backgroundColor: colors.accent }]}
						>
							<Ionicons color={colors.onAccent} name="checkmark" size={24} />
						</View>
						<Text size="lg" style={styles.title} weight="medium">
							Modal Screen
						</Text>
						<Text muted size="sm" style={styles.description}>
							This is an example modal screen for dialogs and confirmations.
						</Text>
					</View>
					<Button onPress={handleClose} size="sm">
						Close
					</Button>
				</Surface>
			</View>
		</Container>
	);
}

const styles = StyleSheet.create({
	content: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: spacing[4],
	},
	surface: {
		width: "100%",
		maxWidth: 320,
	},
	iconContainer: {
		alignItems: "center",
	},
	iconCircle: {
		width: 48,
		height: 48,
		borderRadius: radii.sm,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: spacing[3],
	},
	title: {
		marginBottom: spacing[1],
	},
	description: {
		textAlign: "center",
		marginBottom: spacing[4],
	},
});

export default Modal;
