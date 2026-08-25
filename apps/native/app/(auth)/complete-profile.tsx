import { zodResolver } from '@hookform/resolvers/zod'
import { Redirect, useRouter } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { z } from 'zod'

import { DobPicker } from "@/components/dob-picker";
import { PrimaryButton } from "@/components/ui/primary-button";
import { FieldError } from "@/components/ui/field-error";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useColors } from '@/hooks/use-theme-color'
import { authClient } from '@/lib/auth-client'
import { isValidPastDob } from '@/lib/date-utils'
import { showError } from '@/lib/feedback'
import { spacing } from '@/theme/spacing'

const DOB_UPDATE_ERROR = 'Failed to save date of birth'

const schema = z.object({
  dob: z.string().min(1, 'Date of birth is required').refine(isValidPastDob, 'Enter a valid past date')
})

type FormValues = z.infer<typeof schema>

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { dob: '' }
  })

  if (isPending) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.appBg }]}>
        <Spinner size='lg' />
      </View>
    )
  }
  if (!session?.user) return <Redirect href='/(auth)/login' />
  if (session.user.dob) return <Redirect href='/(tabs)' />

  const onSubmit = form.handleSubmit(async values => {
    try {
      const result = (await authClient.updateUser({
        dob: values.dob
      } as never)) as { error?: { message?: string } } | undefined
      if (result?.error) {
        showError('Update failed', result.error.message ?? DOB_UPDATE_ERROR)
        return
      }
      router.replace('/(tabs)')
    } catch {
      showError('Update failed', DOB_UPDATE_ERROR)
    }
  })

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg, paddingTop: insets.top + 24 }]}>
      <Text
        size='2xl'
        weight='bold'
      >
        Complete your profile
      </Text>
      <Text
        size='sm'
        muted
      >
        Date of birth is required before using the app.
      </Text>
      <View style={styles.form}>
        <Controller
          control={form.control}
          name='dob'
          render={({ field: { onChange, value } }) => (
            <DobPicker
              value={value}
              onChange={onChange}
              placeholder='Date of birth'
              showPickerInline
            />
          )}
        />
        <FieldError
          error={form.formState.errors.dob?.message}
          isInvalid={!!form.formState.errors.dob}
        />
        <PrimaryButton
          onPress={onSubmit}
          isLoading={form.formState.isSubmitting}
        >
          Continue
        </PrimaryButton>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing[6],
    gap: spacing[2]
  },
  form: {
    marginTop: spacing[4],
    gap: spacing[3]
  }
})
