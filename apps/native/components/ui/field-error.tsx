import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { Text } from './text'

export interface FieldErrorProps {
  error?: string
  isInvalid?: boolean
}

export function FieldError({ error, isInvalid }: FieldErrorProps) {
  const colors = useColors()
  const showError = isInvalid || !!error

  if (!showError || !error) return null

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={14} color={colors.danger} />
      <Text size="sm" danger>
        {error}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
})
