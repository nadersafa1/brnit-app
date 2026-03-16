import { Pressable, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui";
import { useColors } from "@/hooks/use-theme-color";
import { spacing } from "@/theme/spacing";
import { radii } from "@/theme/radii";
import { formatQuantityWithUnit } from "@/lib/utils/numbers";
import type { AlternativeItemProps } from "./types";

export function AlternativeItem({ alternative, onCopy }: Readonly<AlternativeItemProps>) {
  const colors = useColors();
  const quantityText = formatQuantityWithUnit(
    alternative.suggestedQuantity,
    alternative.unit ?? '100g'
  );

  return (
    <Pressable
      onPress={() => onCopy(alternative)}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.info}>
          <Text size="base" weight="semibold" numberOfLines={1}>
            {alternative.name}
          </Text>
          <Text size="sm" accent weight="medium">
            {quantityText}
          </Text>
          <View style={styles.macros}>
            <Text size="xs" muted>
              P: {alternative.protein}g
            </Text>
            <Text size="xs" muted style={styles.dot}>
              •
            </Text>
            <Text size="xs" muted>
              C: {alternative.carbs}g
            </Text>
            <Text size="xs" muted style={styles.dot}>
              •
            </Text>
            <Text size="xs" muted>
              F: {alternative.fat}g
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text size="base" weight="bold" accent>
            {alternative.calories}
          </Text>
          <Text size="xs" muted>
            kcal
          </Text>
          <Ionicons
            name="copy-outline"
            size={16}
            color={colors.muted}
            style={styles.copyIcon}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.sm,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  macros: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing[1],
  },
  dot: {
    marginHorizontal: spacing[1],
  },
  right: {
    alignItems: "flex-end",
  },
  copyIcon: {
    marginTop: spacing[2],
  },
});
