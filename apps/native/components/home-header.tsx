/**
 * Home screen header: avatar, greeting, user name, and notification button.
 */

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { ThemeToggle } from "@/components/theme-toggle";
import { Text } from "@/components/ui/text";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { getGreetingMeta } from "@/lib/greeting";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

interface HomeHeaderProps {
	userImageUrl?: string | null;
	userName: string;
}

type UserAvatarProps = Readonly<{
	userName: string;
	imageUri?: string | null;
}>;

/**
 * Remote avatar or first-letter fallback. Parent should set `key` when `imageUri`
 * changes so a failed load does not stick across URLs.
 */
function UserAvatar({ userName, imageUri }: UserAvatarProps) {
	const colors = useColors();
	const [loadFailed, setLoadFailed] = useState(false);

	if (!imageUri || loadFailed) {
		return (
			<Text size="lg" style={{ color: colors.onAccent }} weight="bold">
				{userName.charAt(0).toUpperCase()}
			</Text>
		);
	}

	return (
		<Image
			onError={() => setLoadFailed(true)}
			source={{ uri: imageUri }}
			style={styles.avatarImage}
		/>
	);
}

export function HomeHeader({
	userName,
	userImageUrl,
}: Readonly<HomeHeaderProps>) {
	const colors = useColors();
	const elevation = useShadows();
	const greetingMeta = getGreetingMeta(new Date().getHours());

	return (
		<View style={styles.header}>
			<View style={styles.headerLeft}>
				<View style={[styles.avatar, { backgroundColor: colors.accent }]}>
					<UserAvatar
						imageUri={userImageUrl}
						key={userImageUrl ?? "none"}
						userName={userName}
					/>
				</View>
				<View>
					<View style={styles.greetingRow}>
						<Text muted size="sm" weight="medium">
							{greetingMeta.label}
						</Text>
						<Ionicons color={colors.muted} name={greetingMeta.icon} size={14} />
					</View>
					<Text size="lg" weight="bold">
						{userName}
					</Text>
				</View>
			</View>
			<View style={styles.headerActions}>
				<ThemeToggle variant="iconButton" />
				<Pressable
					style={[
						styles.notificationButton,
						{ backgroundColor: colors.card },
						elevation.sm,
					]}
				>
					<Ionicons color={colors.ink} name="notifications-outline" size={20} />
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: spacing[6],
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
	},
	greetingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing[1],
	},
	avatar: {
		width: 44,
		height: 44,
		borderRadius: radii.pill,
		marginRight: spacing[3],
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	avatarImage: {
		width: "100%",
		height: "100%",
	},
	headerActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing[2],
	},
	notificationButton: {
		width: 44,
		height: 44,
		borderRadius: radii.pill,
		alignItems: "center",
		justifyContent: "center",
	},
});
