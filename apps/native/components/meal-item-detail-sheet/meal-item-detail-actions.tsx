import { StyleSheet, View } from "react-native";
import { Button } from "@/components/ui";
import { spacing } from "@/theme/spacing";
import type { MealItemDetailActionsProps } from "./types";

export function MealItemDetailActions({
  selectedAlternative,
  isSubmittingDay,
  isSubmittingPlan,
  onReplaceDay,
  onReplacePlan,
}: Readonly<MealItemDetailActionsProps>) {
  const disabled = selectedAlternative == null || isSubmittingDay || isSubmittingPlan;
  return (
    <View style={styles.container}>
      <Button
        onPress={onReplaceDay}
        disabled={disabled}
        loading={isSubmittingDay}
        style={styles.button}
      >
        Replace for this day
      </Button>
      <Button
        onPress={onReplacePlan}
        disabled={disabled}
        loading={isSubmittingPlan}
        variant="outline"
        style={styles.button}
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
