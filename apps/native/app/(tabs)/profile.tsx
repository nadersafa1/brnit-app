import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useRef } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import {
	EditProfileSheet,
	type EditProfileSheetRef,
} from "@/components/edit-profile-sheet";
import { ProfileAppearanceCard } from "@/components/profile/profile-appearance-card";
import { SettingsRow } from "@/components/profile/settings-row";
import { Text } from "@/components/ui/text";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { authClient } from "@/lib/auth-client";
import {
	alertDeleteAccountError,
	promptDeleteAccount,
	promptSignOut,
} from "@/lib/profile/account-alerts";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

/**
 * Profile tab: identity card, theme preference, settings rows, sign-out.
 * Account deletion / sign-out use shared alert helpers so this file stays readable.
 */
export default function Profile() {
	const insets = useSafeAreaInsets();
	const colors = useColors();
	const elevation = useShadows();
	const router = useRouter();
	const { data: session, refetch: refetchSession } = authClient.useSession();
	const editSheetRef = useRef<EditProfileSheetRef>(null);

	const userName = session?.user?.name || "User";
	const userEmail = session?.user?.email || "";
	const userImage = session?.user?.image ?? null;
	const userDob = session?.user?.dob ?? null;

	const openEditSheet = useCallback(() => {
		editSheetRef.current?.open(2);
	}, []);

	// Better Auth session hook exposes `refetch`, not TanStack `invalidateQueries`.
	const handleEditSaveSuccess = useCallback(() => {
		refetchSession?.();
	}, [refetchSession]);

	const handleSignOut = useCallback(() => {
		promptSignOut(() => {
			authClient.signOut().then(
				() => router.replace("/(auth)"),
				() => undefined
			);
		});
	}, [router]);

	const runDeleteAccount = useCallback(async () => {
		const { error } = await authClient.deleteUser();
		if (error) {
			alertDeleteAccountError(
				error.message ??
					"Something went wrong. Try signing in again and deleting from Profile, or use a recent session."
			);
			return;
		}
		await authClient.signOut();
		router.replace("/(auth)");
	}, [router]);

	const handleDeleteAccountPress = useCallback(() => {
		promptDeleteAccount(() => {
			runDeleteAccount().catch(() => undefined);
		});
	}, [runDeleteAccount]);

	return (
		<View style={[styles.container, { backgroundColor: colors.appBg }]}>
			<View
				style={[styles.decorativeBlob, { backgroundColor: colors.decorative }]}
			/>

			<ScrollView
				contentContainerStyle={[
					styles.content,
					{
						paddingTop: insets.top + 16,
						paddingBottom: insets.bottom + 96,
					},
				]}
				showsVerticalScrollIndicator={false}
				style={styles.scrollView}
			>
				<Text size="2xl" style={styles.title} weight="bold">
					Profile
				</Text>

				<View
					style={[
						styles.profileCard,
						{ backgroundColor: colors.card },
						elevation.md,
					]}
				>
					<View
						style={[styles.avatarLarge, { backgroundColor: colors.accent }]}
					>
						{userImage ? (
							<Image source={{ uri: userImage }} style={styles.avatarImage} />
						) : (
							<Text size="3xl" style={{ color: colors.onAccent }} weight="bold">
								{userName.charAt(0).toUpperCase()}
							</Text>
						)}
					</View>
					<Text size="xl" weight="bold">
						{userName}
					</Text>
					<Text muted size="sm">
						{userEmail}
					</Text>
				</View>

				<ProfileAppearanceCard />

				<View
					style={[
						styles.settingsCard,
						{ backgroundColor: colors.card },
						elevation.md,
					]}
				>
					<SettingsRow
						colors={colors}
						icon="person-outline"
						label="Edit Profile"
						onPress={openEditSheet}
					/>
					<SettingsRow
						colors={colors}
						icon="notifications-outline"
						label="Notifications"
					/>
					<SettingsRow colors={colors} icon="fitness-outline" label="Goals" />
					<SettingsRow
						colors={colors}
						icon="help-circle-outline"
						label="Help & Support"
					/>
					<SettingsRow
						colors={colors}
						destructive
						icon="trash-outline"
						isLast
						label="Delete account"
						onPress={handleDeleteAccountPress}
					/>
				</View>

				<Pressable
					onPress={handleSignOut}
					style={({ pressed }) => [
						styles.signOutButton,
						{
							backgroundColor: colors.card,
							transform: [{ scale: pressed ? 0.98 : 1 }],
						},
						elevation.md,
					]}
				>
					<Ionicons color={colors.dangerFg} name="log-out-outline" size={20} />
					<Text danger size="base" style={styles.signOutText} weight="semibold">
						Sign Out
					</Text>
				</Pressable>
			</ScrollView>

			<BottomNav activeTab="profile" />
			<EditProfileSheet
				initialDob={userDob}
				initialImageUrl={userImage}
				initialName={userName}
				onSaveSuccess={handleEditSaveSuccess}
				ref={editSheetRef}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	decorativeBlob: {
		position: "absolute",
		top: -80,
		right: -80,
		width: 256,
		height: 256,
		borderRadius: radii.pill,
	},
	scrollView: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
		paddingHorizontal: spacing[4],
	},
	title: {
		marginBottom: spacing[6],
	},
	profileCard: {
		borderRadius: radii.xl,
		padding: spacing[5],
		marginBottom: spacing[4],
		alignItems: "center",
	},
	avatarLarge: {
		width: 80,
		height: 80,
		borderRadius: radii.pill,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: spacing[3],
		overflow: "hidden",
	},
	avatarImage: {
		width: "100%",
		height: "100%",
	},
	settingsCard: {
		borderRadius: radii.xl,
		overflow: "hidden",
	},
	signOutButton: {
		borderRadius: radii.xl,
		padding: spacing[4],
		marginTop: spacing[4],
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	signOutText: {
		marginLeft: spacing[2],
	},
});
