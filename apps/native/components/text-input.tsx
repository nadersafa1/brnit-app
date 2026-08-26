import { Ionicons } from "@expo/vector-icons";
import {
	TextInput as RNTextInput,
	type TextInputProps as RNTextInputProps,
	StyleSheet,
	View,
	type ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";
import { fontSize } from "@/theme/typography";

interface TextInputProps extends Omit<RNTextInputProps, "style"> {
	containerStyle?: ViewStyle;
	icon?: keyof typeof Ionicons.glyphMap;
	onChangeText: (text: string) => void;
	placeholder: string;
	value: string;
}

export function TextInput({
	value,
	onChangeText,
	placeholder,
	icon = "mail-outline",
	keyboardType,
	autoCapitalize,
	autoComplete,
	containerStyle,
	...props
}: TextInputProps) {
	const colors = useColors();

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: colors.card, borderColor: colors.border },
				containerStyle,
			]}
		>
			{icon && (
				<Ionicons
					color={colors.muted}
					name={icon}
					size={16}
					style={styles.icon}
				/>
			)}
			<RNTextInput
				autoCapitalize={autoCapitalize}
				autoComplete={autoComplete}
				keyboardType={keyboardType}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor={colors.muted}
				style={[styles.input, { color: colors.ink }]}
				value={value}
				{...props}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: radii.sm,
		paddingHorizontal: spacing[4],
	},
	icon: {
		marginRight: spacing[3],
	},
	input: {
		flex: 1,
		paddingVertical: spacing[3],
		fontSize: fontSize.base,
	},
});
