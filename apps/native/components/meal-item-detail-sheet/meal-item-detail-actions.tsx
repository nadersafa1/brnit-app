import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/button";
import { spacing } from "@/theme/spacing";

import type { MealItemDetailActionsProps } from "./types";

export function MealItemDetailActions({
	itemIsOverridden,
	selectedAlternative,
	isSubmittingDay,
	isSubmittingPlan,
	isRestoringForDay,
	onReplaceDay,
	onReplacePlan,
	onRestoreOriginalForDay,
}: Readonly<MealItemDetailActionsProps>) {
	const mutationInFlight =
		isSubmittingDay || isSubmittingPlan || isRestoringForDay;
	const replaceBlocked = selectedAlternative == null || mutationInFlight;

	return (
		<View style={styles.container}>
			{itemIsOverridden ? (
				<Button
					disabled={mutationInFlight}
					loading={isRestoringForDay}
					onPress={onRestoreOriginalForDay}
					style={styles.button}
					variant="outline"
				>
					Restore original for this day
				</Button>
			) : null}
			<Button
				disabled={replaceBlocked}
				loading={isSubmittingDay}
				onPress={onReplaceDay}
				style={styles.button}
			>
				Replace for this day
			</Button>
			<Button
				disabled={replaceBlocked}
				loading={isSubmittingPlan}
				onPress={onReplacePlan}
				style={styles.button}
				variant="outline"
			>
				Replace for rest of plan
			</Button>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { gap: spacing[2] },
	button: { flex: 1 },
});
