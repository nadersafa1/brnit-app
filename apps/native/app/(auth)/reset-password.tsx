import { Ionicons } from "@expo/vector-icons";
import { Link, Redirect, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PasswordInput } from "@/components/password-input";
import { FieldError } from "@/components/ui/field-error";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Text } from "@/components/ui/text";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { authClient } from "@/lib/auth-client";
import { showError, showSuccess } from "@/lib/feedback";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

function getTokenFromParams(params: {
	token?: string | string[];
}): string | undefined {
	const raw = params.token;
	if (typeof raw === "string") {
		return raw;
	}
	if (Array.isArray(raw) && raw.length > 0) {
		return raw[0];
	}
	return;
}

export default function ResetPasswordScreen() {
	const insets = useSafeAreaInsets();
	const colors = useColors();
	const elevation = useShadows();
	const token = getTokenFromParams(
		useLocalSearchParams<{ token?: string | string[] }>()
	);
	const { data: session, isPending } = authClient.useSession();
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (isPending) {
		return null;
	}

	if (session?.user) {
		return <Redirect href="/(tabs)" />;
	}

	if (!token) {
		return (
			<ScrollView
				contentContainerStyle={[
					styles.contentContainer,
					{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
				]}
				style={[styles.scrollView, { backgroundColor: colors.appBg }]}
			>
				<View
					style={[styles.card, { backgroundColor: colors.card }, elevation.lg]}
				>
					<Text size="2xl" style={styles.title} weight="bold">
						Invalid reset link
					</Text>
					<Text muted size="sm" style={styles.subtitle}>
						This reset link is invalid or has expired. Please request a new one.
					</Text>
					<Link asChild href="/(auth)/forgot-password">
						<TouchableOpacity>
							<Text accent size="sm" style={styles.linkText} weight="medium">
								Request new link
							</Text>
						</TouchableOpacity>
					</Link>
				</View>
			</ScrollView>
		);
	}

	async function handleResetPassword() {
		if (newPassword.length < 8) {
			const message = "Password must be at least 8 characters";
			setError(message);
			showError(message);
			return;
		}
		if (newPassword !== confirmPassword) {
			const message = "Passwords do not match";
			setError(message);
			showError(message);
			return;
		}
		setIsLoading(true);
		setError(null);

		const { error: err } = await authClient.resetPassword({
			newPassword,
			token,
		});

		setIsLoading(false);
		if (err) {
			let message: string;
			if (err.code === "INVALID_TOKEN") {
				message = "Reset link is invalid or expired";
			} else {
				message = err.message || "Failed to reset password";
			}
			setError(message);
			showError(message);
			return;
		}
		showSuccess("Password reset");
		const { router } = await import("expo-router");
		router.replace("/(auth)/login");
	}

	return (
		<ScrollView
			contentContainerStyle={[
				styles.contentContainer,
				{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
			]}
			style={[styles.scrollView, { backgroundColor: colors.appBg }]}
		>
			<View style={styles.iconContainer}>
				<View
					style={[styles.iconCircle, { backgroundColor: colors.decorative }]}
				>
					<Ionicons color={colors.ink} name="lock-open-outline" size={48} />
				</View>
			</View>

			<View
				style={[styles.card, { backgroundColor: colors.card }, elevation.lg]}
			>
				<Text size="2xl" style={styles.title} weight="bold">
					Set new password
				</Text>
				<Text muted size="sm" style={styles.subtitle}>
					Enter your new password below.
				</Text>

				<View style={styles.errorContainer}>
					<FieldError error={error ?? undefined} isInvalid={!!error} />
				</View>

				<View style={styles.form}>
					<PasswordInput
						autoComplete="new-password"
						onChangeText={setNewPassword}
						placeholder="New password"
						value={newPassword}
					/>

					<PasswordInput
						autoComplete="new-password"
						onChangeText={setConfirmPassword}
						placeholder="Confirm password"
						value={confirmPassword}
					/>

					<View style={styles.buttonContainer}>
						<PrimaryButton isLoading={isLoading} onPress={handleResetPassword}>
							Reset password
						</PrimaryButton>
					</View>

					<View style={styles.linkContainer}>
						<Link asChild href="/(auth)/login">
							<TouchableOpacity>
								<Text accent size="sm" weight="medium">
									Back to sign in
								</Text>
							</TouchableOpacity>
						</Link>
					</View>
				</View>
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
	subtitle: {
		marginBottom: spacing[6],
	},
	errorContainer: {
		marginBottom: spacing[4],
	},
	form: {
		gap: spacing[4],
	},
	buttonContainer: {
		marginTop: spacing[2],
	},
	linkContainer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		marginTop: spacing[4],
	},
	linkText: {
		textAlign: "center",
	},
});
