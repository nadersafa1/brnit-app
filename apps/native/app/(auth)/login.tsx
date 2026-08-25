import { Ionicons } from "@expo/vector-icons";
import { Link, Redirect, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
	Platform,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthSocialIconButtons } from "@/components/auth/auth-social-icon-buttons";
import { PasswordInput } from "@/components/password-input";
import { TextInput } from "@/components/text-input";
import { FieldError } from "@/components/ui/field-error";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { BETTER_AUTH_SOCIAL_CALLBACK_PATH } from "@/constants/better-auth-social";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { authClient } from "@/lib/auth-client";
import { createSocialSignInCallbacks } from "@/lib/auth-social-callbacks";
import { signInWithAppleUsingBetterAuth } from "@/lib/sign-in-with-apple-better-auth";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

export default function LoginScreen() {
	const insets = useSafeAreaInsets();
	const colors = useColors();
	const elevation = useShadows();
	const { invitationId } = useLocalSearchParams<{ invitationId?: string }>();
	const { data: session, isPending } = authClient.useSession();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isEmailLoading, setIsEmailLoading] = useState(false);
	const [isSocialLoading, setIsSocialLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const isFormBusy = isEmailLoading || isSocialLoading;

	/** Sign in with Apple exists only on iOS; capability is re-checked inside the native module when the user taps. */
	const showAppleSocialButton = Platform.OS === "ios";

	if (isPending) {
		return (
			<View
				style={[styles.loadingContainer, { backgroundColor: colors.appBg }]}
			>
				<Spinner size="lg" />
			</View>
		);
	}

	if (session?.user) {
		if (!session.user.dob) {
			return <Redirect href="/(auth)/complete-profile" />;
		}
		if (invitationId) {
			return (
				<Redirect
					href={{ pathname: "/accept-invitation", params: { invitationId } }}
				/>
			);
		}
		return <Redirect href="/(tabs)" />;
	}

	async function handleLogin() {
		setIsEmailLoading(true);
		setError(null);

		await authClient.signIn.email(
			{ email, password },
			{
				onError(error) {
					setError(error.error?.message || "Failed to sign in");
					setIsEmailLoading(false);
				},
				onSuccess() {
					setEmail("");
					setPassword("");
				},
				onFinished() {
					setIsEmailLoading(false);
				},
			}
		);
	}

	async function handleGoogleLogin() {
		setIsSocialLoading(true);
		setError(null);
		try {
			await authClient.signIn.social(
				{ provider: "google", callbackURL: BETTER_AUTH_SOCIAL_CALLBACK_PATH },
				createSocialSignInCallbacks(
					setError,
					setIsSocialLoading,
					"Google sign-in failed"
				)
			);
		} finally {
			setIsSocialLoading(false);
		}
	}

	async function handleAppleLogin() {
		try {
			await signInWithAppleUsingBetterAuth(authClient, {
				setError,
				setIsLoading: setIsSocialLoading,
				callbackURL: BETTER_AUTH_SOCIAL_CALLBACK_PATH,
			});
		} finally {
			setIsSocialLoading(false);
		}
	}

	return (
		<ScrollView
			contentContainerStyle={[
				styles.contentContainer,
				{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
			]}
			style={[styles.scrollView, { backgroundColor: colors.appBg }]}
		>
			<View style={styles.mainContent}>
				<View style={styles.iconContainer}>
					<View
						style={[styles.iconCircle, { backgroundColor: colors.decorative }]}
					>
						<Ionicons color={colors.ink} name="shield-checkmark" size={48} />
					</View>
				</View>

				<View
					style={[styles.card, { backgroundColor: colors.card }, elevation.lg]}
				>
					<Text size="2xl" style={styles.title} weight="bold">
						Sign In
					</Text>
					<Text muted size="sm" style={styles.subtitle}>
						Welcome back! Sign in to continue your fitness journey.
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

						<PasswordInput
							autoComplete="password"
							onChangeText={setPassword}
							placeholder="Password"
							value={password}
						/>

						<View style={styles.forgotContainer}>
							<Link asChild href="/(auth)/forgot-password">
								<TouchableOpacity>
									<Text accent size="sm" weight="medium">
										Forgot password?
									</Text>
								</TouchableOpacity>
							</Link>
						</View>

						<AuthSocialIconButtons
							cardBackgroundColor={colors.card}
							iconMutedColor={colors.subtle}
							isLoading={isFormBusy}
							onApplePress={
								showAppleSocialButton ? handleAppleLogin : undefined
							}
							onGooglePress={handleGoogleLogin}
							showApple={showAppleSocialButton}
						/>

						<View style={styles.buttonContainer}>
							<PrimaryButton
								isDisabled={isSocialLoading}
								isLoading={isEmailLoading}
								onPress={handleLogin}
							>
								Sign In
							</PrimaryButton>
						</View>

						<View style={styles.linkContainer}>
							<Text muted size="sm">
								Don't have an account?{" "}
							</Text>
							<Link asChild href="/(auth)/sign-up">
								<TouchableOpacity>
									<Text accent size="sm" weight="medium">
										Sign up
									</Text>
								</TouchableOpacity>
							</Link>
						</View>
					</View>
				</View>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	scrollView: {
		flex: 1,
	},
	contentContainer: {
		paddingHorizontal: spacing[6],
		minHeight: "100%",
	},
	mainContent: {
		flex: 1,
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
	forgotContainer: {
		alignItems: "flex-end",
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
