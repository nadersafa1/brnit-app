import { StyleSheet, View } from 'react-native'

import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import type { FoodItemAlternative } from '@/lib/api/member-food-types'
import { spacing } from '@/theme/spacing'

import { MealItemAlternativeRow } from './meal-item-alternative-row'

type MealItemAlternativesSuggestionsProps = {
  isLoading: boolean
  isError: boolean
  alternatives: FoodItemAlternative[]
  selectedAlternative: FoodItemAlternative | null
  onSelectAlternative: (alternative: FoodItemAlternative) => void
}

/** Loading, error, empty, and list states for the "replace with" suggestion list. */
export function MealItemAlternativesSuggestions({
  isLoading,
  isError,
  alternatives,
  selectedAlternative,
  onSelectAlternative,
}: Readonly<MealItemAlternativesSuggestionsProps>) {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Spinner size="lg" />
        <Text muted style={styles.statusText}>
          Loading suggestions...
        </Text>
      </View>
    )
  }

  if (isError) {
    return (
      <Text muted style={styles.statusText}>
        Could not load suggestions.
      </Text>
    )
  }

  if (alternatives.length === 0) {
    return (
      <Text muted style={styles.statusText}>
        No suggestions found.
      </Text>
    )
  }

  return (
    <>
      {alternatives.map((alternative) => (
        <MealItemAlternativeRow
          key={alternative.foodItemId}
          alternative={alternative}
          selected={selectedAlternative?.foodItemId === alternative.foodItemId}
          onPress={onSelectAlternative}
        />
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', paddingVertical: spacing[4] },
  statusText: { marginBottom: spacing[2] },
})
