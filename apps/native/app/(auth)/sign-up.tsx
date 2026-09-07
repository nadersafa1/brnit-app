import { Ionicons } from "@expo/vector-icons";
import { Link, Redirect } from "expo-router";
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
import { AuthSuccessScreen } from "@/components/auth/auth-success-screen";
import { DobPicker } from "@/components/dob-picker";
import { PasswordInput } from "@/components/password-input";
import { TextInput } from "@/components/text-input";
import { FieldError } from "@/components/ui/field-error";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { BETTER_AUTH_SOCIAL_CALLBACK_PATH } from "@/constants/better-auth-social";
import { DEEP_LINKS } from "@/constants/deep-links";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { authClient } from "@/lib/auth-client";
import { createSocialSignInCallbacks } from "@/lib/auth-social-callbacks";
import { dobIsoStringToDate, isValidPastDob } from "@/lib/date/dob";
import { signInWithAppleUsingBetterAuth } from "@/lib/sign-in-with-apple-better-auth";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

interface PasswordRequirement {
	label: string;
	met: boolean;
}

const MIN_PASSWORD_LENGTH = 8;
const CONTAINS_DIGIT = /\d/;
const CONTAINS_WHITESPACE = /\s/;
const CONTAINS_SYMBOL = /[!@#$%^&*(),.?":{}|<>]/;

/** The checklist under the password field; labels double as React keys. */
function describePasswordRequirements(password: string): PasswordRequirement[] {
	return [
		{
			label: `Minimum ${MIN_PASSWORD_LENGTH} characters`,
			met: password.length >= MIN_PASSWORD_LENGTH,
		},
		{ label: "One number required", met: CONTAINS_DIGIT.test(password) },
		{ label: "No spaces allowed", met: !CONTAINS_WHITESPACE.test(password) },
		{
			label: "Add a symbol (e.g., @, #, !)",
			met: CONTAINS_SYMBOL.test(password),
		},
	];
}

export default function SignUpScreen() {
	const insets = useSafeAreaInsets();
	const colors = useColors();
	const elevation = useShadows();
	const { data: session, isPending } = authClient.useSession();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [dob, setDob] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isEmailLoading, setIsEmailLoading] = useState(false);
	const [isSocialLoading, setIsSocialLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const isFormBusy = isEmailLoading || isSocialLoading;
	const [sent, setSent] = useState(false);

	/** Sign in with Apple exists only on iOS; availability is enforced again inside the Apple auth module on tap. */
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
		return <Redirect href="/(tabs)" />;
	}

	const passwordRequirements = describePasswordRequirements(password);

	const allRequirementsMet = passwordRequirements.every((req) => req.met);
	const passwordsMatch =
		password === confirmPassword && confirmPassword.length > 0;
	const isDobValid = isValidPastDob(dob);

	async function handleSignUp() {
		if (!isDobValid) {
			setError(
				"Enter date of birth as YYYY-MM-DD and make sure it is in the past"
			);
			return;
		}
		if (!allRequirementsMet) {
			setError("Please meet all password requirements");
			return;
		}
		if (!passwordsMatch) {
			setError("Passwords do not match");
			return;
		}

		setIsEmailLoading(true);
		setError(null);

		await authClient.signUp.email(
			{
				name,
				email,
				dob: dobIsoStringToDate(dob),
				password,
				callbackURL: DEEP_LINKS.root,
			},
			{
				onError(error) {
					setError(error.error?.message || "Failed to sign up");
					setIsEmailLoading(false);
				},
				onSuccess() {
					setName("");
					setEmail("");
					setDob("");
					setPassword("");
					setConfirmPassword("");
					setSent(true);
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

	if (sent) {
		return (
			<AuthSuccessScreen
				backHref="/(auth)/login"
				backLabel="Back to sign in"
				contentContainerStyle={{
					paddingTop: insets.top + 20,
					paddingBottom: insets.bottom + 20,
				}}
				description="We've sent a verification link to your email."
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
						Create Account
					</Text>
					<Text muted size="sm" style={styles.subtitle}>
						Set a strong password to keep your account safe.
					</Text>

					<View style={styles.errorContainer}>
						<FieldError error={error ?? undefined} isInvalid={!!error} />
					</View>

					<View style={styles.form}>
						<TextInput
							autoCapitalize="words"
							autoComplete="name"
							icon="person-outline"
							onChangeText={setName}
							placeholder="Name"
							value={name}
						/>

						<TextInput
							autoCapitalize="none"
							autoComplete="email"
							icon="mail-outline"
							keyboardType="email-address"
							onChangeText={setEmail}
							placeholder="Email"
							value={email}
						/>

						<DobPicker
							onChange={setDob}
							placeholder="Date of birth"
							value={dob}
						/>

						<PasswordInput
							autoComplete="password-new"
							onChangeText={setPassword}
							placeholder="New Password"
							value={password}
						/>

						<PasswordInput
							autoComplete="password-new"
							onChangeText={setConfirmPassword}
							placeholder="Confirm Password"
							value={confirmPassword}
						/>

						{password.length > 0 && (
							<View style={styles.requirements}>
								{passwordRequirements.map((requirement) => (
									<View key={requirement.label} style={styles.requirementRow}>
										<Ionicons
											color={
												requirement.met ? colors.successFg : colors.dangerFg
											}
											name={
												requirement.met ? "checkmark-circle" : "close-circle"
											}
											size={16}
										/>
										<Text
											size="xs"
											style={{
												color: requirement.met
													? colors.successFg
													: colors.dangerFg,
											}}
										>
											{requirement.label}
										</Text>
									</View>
								))}
							</View>
						)}

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
								isDisabled={
									!(allRequirementsMet && passwordsMatch && isDobValid) ||
									isSocialLoading
								}
								isLoading={isEmailLoading}
								onPress={handleSignUp}
							>
								Create Account
							</PrimaryButton>
						</View>

						<View style={styles.linkContainer}>
							<Text muted size="sm">
								Already have an account?{" "}
							</Text>
							<Link asChild href="/(auth)/login">
								<TouchableOpacity>
									<Text accent size="sm" weight="medium">
										Sign in
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
	requirements: {
		gap: spacing[2],
		marginTop: spacing[2],
	},
	requirementRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing[2],
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
