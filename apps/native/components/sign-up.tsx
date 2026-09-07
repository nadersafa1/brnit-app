import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { PasswordInput } from "@/components/password-input";
import { TextInput } from "@/components/text-input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Surface } from "@/components/ui/surface";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { showError, showSuccess } from "@/lib/feedback";
import { spacing } from "@/theme/spacing";

function signUpHandler({
	name,
	email,
	password,
	setError,
	setIsLoading,
	setName,
	setEmail,
	setPassword,
}: {
	name: string;
	email: string;
	password: string;
	setError: (error: string | null) => void;
	setIsLoading: (loading: boolean) => void;
	setName: (name: string) => void;
	setEmail: (email: string) => void;
	setPassword: (password: string) => void;
}) {
	setIsLoading(true);
	setError(null);

	authClient.signUp.email(
		{
			name,
			email,
			password,
		},
		{
			onError(error) {
				const message = error.error?.message || "Failed to sign up";
				setError(message);
				showError(message);
				setIsLoading(false);
			},
			onSuccess() {
				setName("");
				setEmail("");
				setPassword("");
				showSuccess("Account created");
			},
			onFinished() {
				setIsLoading(false);
			},
		}
	);
}

export function SignUp() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function handlePress() {
		signUpHandler({
			name,
			email,
			password,
			setError,
			setIsLoading,
			setName,
			setEmail,
			setPassword,
		});
	}

	return (
		<Surface padding={4} radius="sm" variant="secondary">
			<Text style={styles.title} weight="medium">
				Create Account
			</Text>

			<View style={styles.errorContainer}>
				<FieldError error={error ?? undefined} isInvalid={!!error} />
			</View>

			<View style={styles.form}>
				<View style={styles.field}>
					<Text size="sm" weight="medium">
						Name
					</Text>
					<TextInput
						icon="person-outline"
						onChangeText={setName}
						placeholder="John Doe"
						value={name}
					/>
				</View>

				<View style={styles.field}>
					<Text size="sm" weight="medium">
						Email
					</Text>
					<TextInput
						autoCapitalize="none"
						keyboardType="email-address"
						onChangeText={setEmail}
						placeholder="email@example.com"
						value={email}
					/>
				</View>

				<View style={styles.field}>
					<Text size="sm" weight="medium">
						Password
					</Text>
					<PasswordInput
						onChangeText={setPassword}
						placeholder="••••••••"
						value={password}
					/>
				</View>

				<View style={styles.buttonContainer}>
					<Button
						disabled={isLoading}
						loading={isLoading}
						onPress={handlePress}
					>
						Create Account
					</Button>
				</View>
			</View>
		</Surface>
	);
}

const styles = StyleSheet.create({
	title: {
		marginBottom: spacing[4],
	},
	errorContainer: {
		marginBottom: spacing[3],
	},
	form: {
		gap: spacing[3],
	},
	field: {
		gap: spacing[1],
	},
	buttonContainer: {
		marginTop: spacing[1],
	},
});
