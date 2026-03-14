import { Image } from "expo-image";
import { Pressable, View, StyleSheet } from "react-native";
import { Text } from "@/components/ui";
import { useColors } from "@/hooks/use-theme-color";
import { spacing } from "@/theme/spacing";
import { radii } from "@/theme/radii";
import { shadows } from "@/theme/shadows";
import type { FoodItem } from "@/lib/api/member-food-types";

interface FoodItemCardProps {
  item: FoodItem;
  onPress?: () => void;
}

export function FoodItemCard({ item, onPress }: Readonly<FoodItemCardProps>) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.95 : 1,
        },
        shadows.sm,
      ]}
    >
      <View style={styles.content}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={[styles.image, { backgroundColor: colors.surfaceAlt }]}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.surfaceAlt }]}>
            <Text size="lg" muted>
              🍽️
            </Text>
          </View>
        )}

        <View style={styles.info}>
          <Text size="base" weight="semibold" numberOfLines={1}>
            {item.name}
          </Text>
          {item.categoryName && (
            <Text size="xs" muted numberOfLines={1}>
              {item.categoryName}
            </Text>
          )}
          <View style={styles.macros}>
            <Text size="xs" muted>
              P: {item.protein}g
            </Text>
            <Text size="xs" muted style={styles.macroDivider}>
              •
            </Text>
            <Text size="xs" muted>
              C: {item.carbs}g
            </Text>
            <Text size="xs" muted style={styles.macroDivider}>
              •
            </Text>
            <Text size="xs" muted>
              F: {item.fat}g
            </Text>
          </View>
        </View>

        <View style={styles.caloriesContainer}>
          <Text size="base" weight="bold" accent>
            {item.calories}
          </Text>
          <Text size="xs" muted>
            kcal
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.sm,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
  },
  imagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    marginLeft: spacing[3],
  },
  macros: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing[1],
  },
  macroDivider: {
    marginHorizontal: spacing[1],
  },
  caloriesContainer: {
    alignItems: "flex-end",
  },
});
