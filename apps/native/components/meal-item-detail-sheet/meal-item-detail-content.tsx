import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui";
import { formatQuantityWithUnit } from "@/lib/utils/numbers";
import { spacing } from "@/theme/spacing";
import { MealItemAlternativesSuggestions } from "./meal-item-alternatives-suggestions";
import type { MealItemDetailContentProps } from "./types";

/** Current meal item summary + alternative foods the member can swap in. */
export function MealItemDetailContent({
  item,
  alternatives,
  isLoading,
  isError,
  selectedAlternative,
  onSelectAlternative,
}: Readonly<MealItemDetailContentProps>) {
  return (
    <View style={styles.container}>
      <Text size="base" weight="semibold">
        {item.foodName}
      </Text>
      <Text size="sm" muted>
        {formatQuantityWithUnit(item.quantity, item.unit)} • {item.macros.calories} kcal
      </Text>
      <Text size="xs" muted>
        P: {item.macros.protein}g • C: {item.macros.carbs}g • F: {item.macros.fat}g
      </Text>
      {item.isOverridden && item.originalFoodName ? (
        <Text size="xs" muted>
          Replacing {item.originalFoodName}
        </Text>
      ) : null}

      <Text size="sm" weight="semibold" style={styles.sectionTitle}>
        Suggestions to replace
      </Text>
      <MealItemAlternativesSuggestions
        isLoading={isLoading}
        isError={isError}
        alternatives={alternatives}
        selectedAlternative={selectedAlternative}
        onSelectAlternative={onSelectAlternative}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[1] },
  sectionTitle: { marginTop: spacing[3], marginBottom: spacing[1] },
});
