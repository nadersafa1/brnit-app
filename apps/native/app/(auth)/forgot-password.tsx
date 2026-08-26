import { Ionicons } from "@expo/vector-icons";
import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthSuccessScreen } from "@/components/auth/auth-success-screen";
import { TextInput } from "@/components/text-input";
import { FieldError } from "@/components/ui/field-error";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Text } from "@/components/ui/text";
import { DEEP_LINKS } from "@/constants/deep-links";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { authClient } from "@/lib/auth-client";
import { showError, showSuccess } from "@/lib/feedback";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

export default function ForgotPasswordScreen() {
	const insets = useSafeAreaInsets();
	const colors = useColors();
	const elevation = useShadows();
	const { data: session, isPending } = authClient.useSession();
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sent, setSent] = useState(false);

	if (isPending) {
		return null;
	}

	if (session?.user) {
		return <Redirect href="/(tabs)" />;
	}

	async function handleSendResetLink() {
		if (!email.trim()) {
			const message = "Please enter your email";
			setError(message);
			showError(message);
			return;
		}
		setIsLoading(true);
		setError(null);

		const { error: err } = await authClient.requestPasswordReset({
			email: email.trim(),
			redirectTo: DEEP_LINKS.resetPassword,
		});

		setIsLoading(false);
		if (err) {
			const message = err.message || "Failed to send reset link";
			setError(message);
			showError(message);
			return;
		}
		showSuccess("Reset link sent", "Check your email");
		setSent(true);
	}

	if (sent) {
		return (
			<AuthSuccessScreen
				backHref="/(auth)/login"
				backLabel="Back to sign in"
				contentContainerStyle={{
					paddingTop: insets.top + 20,
					paddingBottom: insets.bottom + 20,
					justifyContent: "center",
				}}
				description="If an account exists for that email, we've sent a link to reset your password."
				icon="mail-open-outline"
				title="Check your email"
			/>
		);
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
					<Ionicons color={colors.ink} name="key-outline" size={48} />
				</View>
			</View>

			<View
				style={[styles.card, { backgroundColor: colors.card }, elevation.lg]}
			>
				<Text size="2xl" style={styles.title} weight="bold">
					Forgot password
				</Text>
				<Text muted size="sm" style={styles.subtitle}>
					Enter your email and we'll send you a link to reset your password.
				</Text>

				<View style={styles.errorContainer}>
					<FieldError error={error ?? undefined} isInvalid={!!error} />
				</View>

				<View style={styles.form}>
					<TextInput
						autoCapitalize="none"
						autoComplete="email"
						icon="mail-outline"
						keyboardType="email-address"
						onChangeText={setEmail}
						placeholder="Email"
						value={email}
					/>

					<View style={styles.buttonContainer}>
						<PrimaryButton isLoading={isLoading} onPress={handleSendResetLink}>
							Send reset link
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
});
