import {
	type ImageStyle,
	type StyleProp,
	StyleSheet,
	type TextStyle,
	type ViewStyle,
} from "react-native";

type Style = StyleProp<ViewStyle | TextStyle | ImageStyle>;

export function cn(...styles: Style[]): ViewStyle | TextStyle | ImageStyle {
	return StyleSheet.flatten(styles.filter(Boolean));
}
