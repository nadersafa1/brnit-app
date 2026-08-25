import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from "@/components/ui/text";
import { useColors, useShadows } from '@/hooks/use-theme-color'
import { formatFoodCategoriesDisplay } from '@/lib/helpers/food-item-display'
import type { FoodItem } from '@/lib/api/member-food-types'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'

interface FoodItemCardProps {
  item: FoodItem
  onPress?: () => void
  onAlternativesPress?: () => void
}

type FoodItemThumbnailProps = Readonly<{
  imageUrl?: string | null
}>

/**
 * Loads the food thumbnail or shows an icon placeholder. Parent should pass `key`
 * including `imageUrl` so a failed load resets when the URL changes.
 */
function FoodItemThumbnail({ imageUrl }: FoodItemThumbnailProps) {
  const colors = useColors()
  const [loadFailed, setLoadFailed] = useState(false)
  const uri = imageUrl ?? undefined

  if (!uri || loadFailed) {
    return (
      <View style={[styles.imagePlaceholder, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="image-outline" size={20} color={colors.muted} />
      </View>
    )
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, { backgroundColor: colors.surfaceAlt }]}
      contentFit="cover"
      onError={() => setLoadFailed(true)}
    />
  )
}

export function FoodItemCard({
  item,
  onPress,
  onAlternativesPress,
}: Readonly<FoodItemCardProps>) {
  const colors = useColors()
  const elevation = useShadows()

  const thumbnailKey = `${item.id}-${item.imageUrl ?? ''}`

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
        elevation.sm,
      ]}
    >
      <View style={styles.content}>
        <FoodItemThumbnail key={thumbnailKey} imageUrl={item.imageUrl} />
        <View style={styles.info}>
          <Text size="base" weight="semibold" numberOfLines={1}>
            {item.name}
          </Text>
          {item.categories?.length ? (
            <Text size="xs" muted numberOfLines={1}>
              {formatFoodCategoriesDisplay(item.categories)}
            </Text>
          ) : null}
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

        <View style={styles.rightSection}>
          <View style={styles.caloriesContainer}>
            <Text size="base" weight="bold" accent>
              {item.calories}
            </Text>
            <Text size="xs" muted>
              kcal
            </Text>
          </View>
          {onAlternativesPress ? (
            <Pressable
              onPress={onAlternativesPress}
              hitSlop={8}
              style={({ pressed }) => [
                styles.alternativesButton,
                { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="swap-horizontal" size={18} color={colors.accent} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.sm,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing[3],
  },
  macros: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  macroDivider: {
    marginHorizontal: spacing[1],
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  caloriesContainer: {
    alignItems: 'flex-end',
  },
  alternativesButton: {
    padding: spacing[1],
    borderRadius: radii.xs,
  },
})
