import { StyleSheet, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { Input } from '@/components/ui'
import { spacing } from '@/theme/spacing'
import type { TextStep } from '@/lib/onboarding/types'

type Props = {
  step: TextStep
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
}

export function TextInputBody({ step, value, onChange, onSubmit }: Readonly<Props>) {
  return (
    <View style={styles.container}>
      <Input
        autoFocus
        value={value}
        onChangeText={onChange}
        placeholder={step.placeholder}
        maxLength={40}
        textContentType="name"
        returnKeyType="next"
        enablesReturnKeyAutomatically
        onSubmitEditing={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          onSubmit?.()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[8],
    paddingHorizontal: spacing[4],
  },
})
