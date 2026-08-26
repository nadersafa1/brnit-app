import { Redirect } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Spinner } from "@/components/ui/spinner";
import { useColors } from "@/hooks/use-theme-color";
import { authClient } from "@/lib/auth-client";
import { useIsOnboarded } from "@/store/app-settings-store";

export default function Index() {
	const colors = useColors();
	const isOnboarded = useIsOnboarded();
	const { data: session, isPending } = authClient.useSession();

	if (!isOnboarded) {
		return <Redirect href="/(onboarding)" />;
	}

	if (isPending) {
		return (
			<View style={[styles.container, { backgroundColor: colors.appBg }]}>
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

	return <Redirect href="/(auth)" />;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
});
