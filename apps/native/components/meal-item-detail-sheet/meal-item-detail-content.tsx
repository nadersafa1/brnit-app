import { StyleSheet, View } from "react-native";
import { Spinner, Text } from "@/components/ui";
import type { CurrentDietPlanMealItem } from "@/lib/api/member-types";
import type { FoodItemAlternative } from "@/lib/api/member-food-types";
import { formatQuantityWithUnit } from "@/lib/utils/numbers";
import { spacing } from "@/theme/spacing";
import { MealItemAlternativeRow } from "./meal-item-alternative-row";

type MealItemDetailContentProps = {
  item: CurrentDietPlanMealItem;
  alternatives: FoodItemAlternative[];
  isLoading: boolean;
  isError: boolean;
  selectedAlternative: FoodItemAlternative | null;
  onSelectAlternative: (alternative: FoodItemAlternative) => void;
};

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
      <Text size="base" weight="semibold">{item.foodName}</Text>
      <Text size="sm" muted>{formatQuantityWithUnit(item.quantity, item.unit)} • {item.macros.calories} kcal</Text>
      <Text size="xs" muted>P: {item.macros.protein}g • C: {item.macros.carbs}g • F: {item.macros.fat}g</Text>
      {item.isOverridden && item.originalFoodName ? (
        <Text size="xs" muted>
          Replacing {item.originalFoodName}
        </Text>
      ) : null}

      <Text size="sm" weight="semibold" style={styles.sectionTitle}>
        Suggestions to replace
      </Text>
      {isLoading ? (
        <View style={styles.centered}>
          <Spinner size="lg" />
          <Text muted style={styles.statusText}>Loading suggestions...</Text>
        </View>
      ) : null}
      {!isLoading && isError ? (
        <Text muted style={styles.statusText}>Could not load suggestions.</Text>
      ) : null}
      {!isLoading && !isError && alternatives.length === 0 ? (
        <Text muted style={styles.statusText}>No suggestions found.</Text>
      ) : null}
      {!isLoading && !isError
        ? alternatives.map((alternative) => (
            <MealItemAlternativeRow
              key={alternative.foodItemId}
              alternative={alternative}
              selected={selectedAlternative?.foodItemId === alternative.foodItemId}
              onPress={onSelectAlternative}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[1] },
  sectionTitle: { marginTop: spacing[3], marginBottom: spacing[1] },
  centered: { alignItems: "center", paddingVertical: spacing[4] },
  statusText: { marginBottom: spacing[2] },
});
