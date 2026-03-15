import { useCallback, useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import type { BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button, Text } from '@/components/ui'
import { showError, showSuccess } from '@/lib/feedback'
import { useColors } from '@/hooks/use-theme-color'
import { useFoodItemAlternatives } from '@/hooks/use-food-item-alternatives'
import { spacing } from '@/theme/spacing'
import type { FoodItemAlternative } from '@/lib/api/member-food-types'
import { quantitySchema, type QuantityFormValues } from './schema'
import { InputState } from './input-state'
import { ResultsState } from './results-state'
import type { FoodAlternativesSheetProps, SheetState } from './types'
import { AppBottomSheet, SheetFooter, type AppBottomSheetRef } from '@/components/bottom-sheet'

export function FoodAlternativesSheet({ foodItem, onClose }: Readonly<FoodAlternativesSheetProps>) {
  const colors = useColors()
  const sheetRef = useRef<AppBottomSheetRef>(null)
  const [sheetState, setSheetState] = useState<SheetState>('input')
  const [quantity, setQuantity] = useState(0)

  const form = useForm<QuantityFormValues>({
    resolver: zodResolver(quantitySchema),
    defaultValues: { quantity: '100' },
  })

  const { data, isLoading, isError } = useFoodItemAlternatives({
    foodItemId: foodItem?.id ?? '',
    quantity,
    enabled: sheetState === 'results' && quantity > 0,
  })

  useEffect(() => {
    if (sheetState === 'results' && isError) showError('Failed to load alternatives')
  }, [sheetState, isError])

  useEffect(() => {
    if (foodItem) {
      sheetRef.current?.open(1)
      setSheetState('input')
      form.reset({ quantity: '100' })
    } else {
      sheetRef.current?.close()
    }
  }, [foodItem])

  const handleSheetClose = useCallback(() => {
    setSheetState('input')
    setQuantity(0)
    onClose()
  }, [onClose])

  const handleSubmit = form.handleSubmit(values => {
    setQuantity(Number(values.quantity))
    setSheetState('results')
  })

  const handleBack = useCallback(() => {
    setSheetState('input')
    setQuantity(0)
  }, [])

  const handleCopy = useCallback(async (alt: FoodItemAlternative) => {
    const text = `${alt.name}: ${alt.suggestedQuantityGrams}g (${alt.calories} kcal, P: ${alt.protein}g, C: ${alt.carbs}g, F: ${alt.fat}g)`
    await Clipboard.setStringAsync(text)
    showSuccess('Copied', 'Alternative copied to clipboard')
  }, [])

  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      {sheetState === 'results' && (
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
      )}
      <Text size="lg" weight="bold" style={styles.title}>
        {sheetState === 'input' ? 'Find Alternatives' : 'Alternatives'}
      </Text>
    </View>
  ), [sheetState, colors.ink, handleBack])

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      sheetState === 'input' ? (
        <SheetFooter {...props}>
          <Button onPress={handleSubmit} style={styles.footerButton}>
            Find Alternatives
          </Button>
        </SheetFooter>
      ) : null,
    [sheetState, handleSubmit]
  )

  const alternatives = data?.data ?? []

  return (
    <AppBottomSheet
      ref={sheetRef}
      onClose={handleSheetClose}
      renderHeader={renderHeader}
      footerComponent={renderFooter}
      keyboardShouldPersistTaps
    >
      {sheetState === 'input' ? (
        <InputState foodItem={foodItem} form={form} />
      ) : (
        <ResultsState
          alternatives={alternatives}
          isLoading={isLoading}
          isError={isError}
          quantity={quantity}
          foodItemName={foodItem?.name ?? ''}
          onCopy={handleCopy}
        />
      )}
    </AppBottomSheet>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  backButton: {
    marginRight: spacing[2],
  },
  title: {
    flex: 1,
  },
  footerButton: {
    flex: 1,
  },
})
