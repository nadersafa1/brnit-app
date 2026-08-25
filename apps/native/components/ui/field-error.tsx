import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/use-theme-color";
import { spacing } from "@/theme/spacing";
import { Text } from "./text";

export interface FieldErrorProps {
	error?: string;
	isInvalid?: boolean;
}

export function FieldError({ error, isInvalid }: FieldErrorProps) {
	const colors = useColors();
	const showError = isInvalid || !!error;

	if (!(showError && error)) {
		return null;
	}

	return (
		<View style={styles.container}>
			<Ionicons color={colors.dangerFg} name="alert-circle" size={14} />
			<Text danger size="sm">
				{error}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing[1],
		marginTop: spacing[1],
	},
});
