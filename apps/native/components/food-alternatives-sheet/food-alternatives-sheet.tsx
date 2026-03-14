import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, StyleSheet, Alert, Pressable } from 'react-native'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { useFoodItemAlternatives } from '@/hooks/use-food-item-alternatives'
import { spacing } from '@/theme/spacing'
import type { FoodItemAlternative } from '@/lib/api/member-food-types'
import { quantitySchema, type QuantityFormValues } from './schema'
import { InputState } from './input-state'
import { ResultsState } from './results-state'
import type { FoodAlternativesSheetProps, SheetState } from './types'

export function FoodAlternativesSheet({ foodItem, onClose }: Readonly<FoodAlternativesSheetProps>) {
  const colors = useColors()
  const bottomSheetRef = useRef<BottomSheet>(null)
  const [sheetState, setSheetState] = useState<SheetState>('input')
  const [quantity, setQuantity] = useState(0)

  const snapPoints = useMemo(() => ['50%', '60%', '70%', '80%'], [])
  const insets = useSafeAreaInsets()

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
    if (foodItem) {
      bottomSheetRef.current?.snapToIndex(1)
      setSheetState('input')
      form.reset({ quantity: '100' })
    } else {
      bottomSheetRef.current?.close()
    }
  }, [foodItem, form])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

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
    Alert.alert('Copied', 'Alternative copied to clipboard')
  }, [])

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      sheetState === 'input' ? (
        <BottomSheetFooter {...props} bottomInset={insets.bottom}>
          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.appBg,
                borderTopColor: colors.border,
              },
            ]}
          >
            <Button onPress={handleSubmit} style={styles.footerButton}>
              Find Alternatives
            </Button>
          </View>
        </BottomSheetFooter>
      ) : null,
    [sheetState, colors.appBg, colors.border, insets.bottom, handleSubmit]
  )

  const alternatives = data?.data ?? []

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      onClose={handleSheetClose}
      backgroundStyle={{ backgroundColor: colors.appBg }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <View style={styles.header}>
        {sheetState === 'results' && (
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
            <Ionicons name='chevron-back' size={24} color={colors.ink} />
          </Pressable>
        )}
        <Text size='lg' weight='bold' style={styles.title}>
          {sheetState === 'input' ? 'Find Alternatives' : 'Alternatives'}
        </Text>
      </View>

      <BottomSheetScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'
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
      </BottomSheetScrollView>
    </BottomSheet>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
  },
})
