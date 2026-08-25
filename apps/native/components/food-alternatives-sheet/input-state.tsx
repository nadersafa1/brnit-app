import { View, StyleSheet } from 'react-native'
import { Controller, UseFormReturn } from 'react-hook-form'
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { spacing } from '@/theme/spacing'
import type { FoodItem } from '@/lib/api/member-food-types'
import type { QuantityFormValues } from './schema'

import type { FoodUnit } from '@/lib/utils/numbers'

function quantityLabel(unit: FoodUnit): string {
  if (unit === '100g') return 'Enter amount (grams)'
  if (unit === 'liters') return 'Enter amount (liters)'
  if (unit === 'cup') return 'Enter amount (cups)'
  if (unit === 'tbsp') return 'Enter amount (tbsp)'
  return 'Enter amount (pieces)'
}

function quantityPlaceholder(unit: FoodUnit): string {
  if (unit === '100g') return 'e.g. 150 (50g steps)'
  if (unit === 'liters') return 'e.g. 1 (0.5 L steps)'
  if (unit === 'cup' || unit === 'tbsp') return 'e.g. 1 (0.5 steps)'
  return 'e.g. 2'
}

interface InputStateProps {
  foodItem: FoodItem | null
  form: UseFormReturn<QuantityFormValues>
}

export function InputState({ foodItem, form }: Readonly<InputStateProps>) {
  const {
    control,
    formState: { errors },
  } = form
  const unit = foodItem?.unit ?? '100g'

  return (
    <View style={styles.container}>
      {foodItem && (
        <View style={styles.selectedFood}>
          <Text size="sm" muted>
            Finding alternatives for:
          </Text>
          <Text size="base" weight="semibold">
            {foodItem.name}
          </Text>
        </View>
      )}

      <Text size="sm" weight="medium" style={styles.label}>
        {quantityLabel(unit)}
      </Text>

      <Controller
        control={control}
        name='quantity'
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            placeholder={quantityPlaceholder(unit)}
            keyboardType='numeric'
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={!!errors.quantity}
          />
        )}
      />

      {errors.quantity && <FieldError error={errors.quantity.message ?? 'Invalid quantity'} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing[2],
  },
  selectedFood: {
    marginBottom: spacing[4],
  },
  label: {
    marginBottom: spacing[2],
  },
})
