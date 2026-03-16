import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui";
import { useColors } from "@/hooks/use-theme-color";
import type { FoodItemAlternative } from "@/lib/api/member-food-types";
import { formatQuantityWithUnit } from "@/lib/utils/numbers";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

type MealItemAlternativeRowProps = {
  alternative: FoodItemAlternative;
  selected: boolean;
  onPress: (alternative: FoodItemAlternative) => void;
};

export function MealItemAlternativeRow({
  alternative,
  selected,
  onPress,
}: Readonly<MealItemAlternativeRowProps>) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => onPress(alternative)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.accent : colors.surfaceAlt,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text size="base" weight="semibold">{alternative.name}</Text>
      <View style={styles.row}>
        <Text size="sm" accent>
          {formatQuantityWithUnit(alternative.suggestedQuantity, alternative.unit)}
        </Text>
        <Text size="sm" muted>{alternative.calories} kcal</Text>
      </View>
      <Text size="xs" muted>
        P: {alternative.protein}g • C: {alternative.carbs}g • F: {alternative.fat}g
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing[3],
    marginBottom: spacing[2],
    gap: spacing[1],
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
