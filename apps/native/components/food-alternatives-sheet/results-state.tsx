import { View, StyleSheet } from "react-native";
import { Spinner, Text } from "@/components/ui";
import { spacing } from "@/theme/spacing";
import type { FoodItemAlternative } from "@/lib/api/member-food-types";
import type { FoodUnit } from "@/lib/utils/numbers";
import { formatQuantityWithUnit } from "@/lib/utils/numbers";
import { AlternativeItem } from "./alternative-item";

interface ResultsStateProps {
  alternatives: FoodItemAlternative[];
  isLoading: boolean;
  isError: boolean;
  quantity: number;
  quantityUnit: FoodUnit;
  foodItemName: string;
  onCopy: (alternative: FoodItemAlternative) => void;
}

export function ResultsState({
  alternatives,
  isLoading,
  isError,
  quantity,
  quantityUnit,
  foodItemName,
  onCopy,
}: Readonly<ResultsStateProps>) {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Spinner size="lg" />
        <Text muted style={styles.loadingText}>
          Finding alternatives...
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text muted>Failed to load alternatives. Please try again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text size="sm" muted style={styles.summary}>
        Alternatives for {formatQuantityWithUnit(quantity, quantityUnit)} of {foodItemName}
      </Text>
      <Text size="xs" muted style={styles.hint}>
        Tap to copy
      </Text>

      {alternatives.length === 0 ? (
        <View style={styles.centered}>
          <Text muted>No alternatives found with similar nutrition.</Text>
        </View>
      ) : (
        alternatives.map((alt) => (
          <AlternativeItem key={alt.foodItemId} alternative={alt} onCopy={onCopy} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing[2],
  },
  centered: {
    alignItems: "center",
    paddingVertical: spacing[8],
  },
  loadingText: {
    marginTop: spacing[3],
  },
  summary: {
    marginBottom: spacing[1],
  },
  hint: {
    marginBottom: spacing[3],
  },
});
