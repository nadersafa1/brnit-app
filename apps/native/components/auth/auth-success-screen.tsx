import { Ionicons } from "@expo/vector-icons";
import { type Href, Link } from "expo-router";
import {
	ScrollView,
	type ScrollViewProps,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { Text } from "@/components/ui/text";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

export interface AuthSuccessScreenProps {
	backHref: Href;
	backLabel: string;
	contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
	description: string;
	icon: keyof typeof Ionicons.glyphMap;
	title: string;
}

export function AuthSuccessScreen({
	icon,
	title,
	description,
	backHref,
	backLabel,
	contentContainerStyle,
}: Readonly<AuthSuccessScreenProps>) {
	const colors = useColors();
	const elevation = useShadows();

	return (
		<ScrollView
			contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
			style={[styles.scrollView, { backgroundColor: colors.appBg }]}
		>
			<View style={styles.iconContainer}>
				<View
					style={[styles.iconCircle, { backgroundColor: colors.decorative }]}
				>
					<Ionicons color={colors.ink} name={icon} size={48} />
				</View>
			</View>
			<View
				style={[styles.card, { backgroundColor: colors.card }, elevation.lg]}
			>
				<Text size="2xl" style={styles.title} weight="bold">
					{title}
				</Text>
				<Text muted size="sm" style={styles.description}>
					{description}
				</Text>
				<Link asChild href={backHref}>
					<TouchableOpacity>
						<Text accent size="sm" style={styles.link} weight="medium">
							{backLabel}
						</Text>
					</TouchableOpacity>
				</Link>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	scrollView: {
		flex: 1,
	},
	contentContainer: {
		paddingHorizontal: spacing[6],
		minHeight: "100%",
		justifyContent: "center",
	},
	iconContainer: {
		alignItems: "center",
		marginBottom: spacing[8],
	},
	iconCircle: {
		width: 96,
		height: 96,
		borderRadius: radii.pill,
		alignItems: "center",
		justifyContent: "center",
	},
	card: {
		borderRadius: radii.sm,
		padding: spacing[6],
	},
	title: {
		marginBottom: spacing[2],
	},
	description: {
		marginBottom: spacing[6],
	},
	link: {
		textAlign: "center",
	},
});
