import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
	TextInput as RNTextInput,
	type TextInputProps as RNTextInputProps,
	StyleSheet,
	TouchableOpacity,
	View,
	type ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";
import { fontSize } from "@/theme/typography";

interface PasswordInputProps
	extends Omit<RNTextInputProps, "style" | "secureTextEntry"> {
	containerStyle?: ViewStyle;
	icon?: keyof typeof Ionicons.glyphMap;
	onChangeText: (text: string) => void;
	placeholder: string;
	value: string;
}

export function PasswordInput({
	value,
	onChangeText,
	placeholder,
	icon = "lock-closed-outline",
	autoComplete,
	containerStyle,
	...props
}: PasswordInputProps) {
	const [isVisible, setIsVisible] = useState(false);
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
				autoCapitalize="none"
				autoComplete={autoComplete}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor={colors.muted}
				secureTextEntry={!isVisible}
				style={[styles.input, { color: colors.ink }]}
				value={value}
				{...props}
			/>
			<TouchableOpacity
				hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				onPress={() => setIsVisible(!isVisible)}
				style={styles.toggleButton}
			>
				<Ionicons
					color={colors.muted}
					name={isVisible ? "eye-outline" : "eye-off-outline"}
					size={16}
				/>
			</TouchableOpacity>
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
	toggleButton: {
		marginLeft: spacing[3],
	},
});
