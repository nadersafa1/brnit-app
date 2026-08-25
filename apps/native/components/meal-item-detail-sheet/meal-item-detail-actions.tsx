import { StyleSheet, View } from 'react-native'

import { Button } from "@/components/ui/button";
import { spacing } from '@/theme/spacing'

import type { MealItemDetailActionsProps } from './types'

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
    isSubmittingDay || isSubmittingPlan || isRestoringForDay
  const replaceBlocked = selectedAlternative == null || mutationInFlight

  return (
    <View style={styles.container}>
      {itemIsOverridden ? (
        <Button
          onPress={onRestoreOriginalForDay}
          disabled={mutationInFlight}
          loading={isRestoringForDay}
          variant="outline"
          style={styles.button}
        >
          Restore original for this day
        </Button>
      ) : null}
      <Button
        onPress={onReplaceDay}
        disabled={replaceBlocked}
        loading={isSubmittingDay}
        style={styles.button}
      >
        Replace for this day
      </Button>
      <Button
        onPress={onReplacePlan}
        disabled={replaceBlocked}
        loading={isSubmittingPlan}
        variant="outline"
        style={styles.button}
      >
        Replace for rest of plan
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing[2] },
  button: { flex: 1 },
})
