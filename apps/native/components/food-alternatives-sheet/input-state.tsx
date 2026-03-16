import { View, StyleSheet } from "react-native";
import { Controller, UseFormReturn } from "react-hook-form";
import { Input, Text, FieldError } from "@/components/ui";
import { spacing } from "@/theme/spacing";
import type { FoodItem } from "@/lib/api/member-food-types";
import type { QuantityFormValues } from "./schema";

function quantityLabel(unit: '100g' | 'piece'): string {
  return unit === '100g' ? 'Enter amount (grams)' : 'Enter amount (pieces)';
}

function quantityPlaceholder(unit: '100g' | 'piece'): string {
  return unit === '100g' ? 'e.g. 100' : 'e.g. 2';
}

interface InputStateProps {
  foodItem: FoodItem | null;
  form: UseFormReturn<QuantityFormValues>;
}

export function InputState({ foodItem, form }: Readonly<InputStateProps>) {
  const {
    control,
    formState: { errors },
  } = form;
  const unit = foodItem?.unit ?? '100g';

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
        name="quantity"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            placeholder={quantityPlaceholder(unit)}
            keyboardType="numeric"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={!!errors.quantity}
          />
        )}
      />

      {errors.quantity && (
        <FieldError error={errors.quantity.message ?? "Invalid quantity"} />
      )}
    </View>
  );
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
});
