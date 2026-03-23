import { useCallback } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

import { PrimaryButton, Button, Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { useAppSettingsStore } from '@/store/app-settings-store'
import { ONBOARDING_STEPS, getNextStepIndex } from '@/lib/onboarding/steps'
import type { OnboardingAnswers, OnboardingStep } from '@/lib/onboarding/types'
import { OnboardingProgress } from './OnboardingProgress'
import {
  SingleChoiceBody,
  MultiChoiceChipsBody,
  TextInputBody,
  MultiTextBody,
  FeatureBody,
  CongratulationsBody,
} from './steps'

type Props = {
  stepIndex: number
}

export function OnboardingContainer({ stepIndex }: Readonly<Props>) {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const answers = useAppSettingsStore((s) => s.onboardingAnswers)
  const updateAnswers = useAppSettingsStore((s) => s.updateOnboardingAnswers)
  const setIsOnboarded = useAppSettingsStore((s) => s.setIsOnboarded)

  const step = ONBOARDING_STEPS[stepIndex]
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1
  const isFirst = stepIndex === 0
  const showBackButton = !isFirst && step.kind !== 'congratulations'

  const navigateNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isLast) {
      setIsOnboarded(true)
      router.replace('/(auth)')
      return
    }
    const nextIndex = getNextStepIndex(step, stepIndex)
    router.push(`/(onboarding)/${nextIndex}`)
  }, [isLast, step, stepIndex, setIsOnboarded])

  const handleSingleSelect = useCallback(
    (value: string) => {
      updateAnswers({ [step.id]: value })
    },
    [step.id, updateAnswers],
  )

  const handleMultiToggle = useCallback(
    (value: string) => {
      const { onboardingAnswers } = useAppSettingsStore.getState()
      const current = (onboardingAnswers[step.id] as string[]) ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      updateAnswers({ [step.id]: next })
    },
    [step.id, updateAnswers],
  )

  const handleTextChange = useCallback(
    (value: string) => {
      updateAnswers({ [step.id]: value })
    },
    [step.id, updateAnswers],
  )

  const handleFieldChange = useCallback(
    (fieldId: string, value: string) => {
      updateAnswers({ [fieldId]: value })
    },
    [updateAnswers],
  )

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.appBg,
          paddingTop: insets.top + spacing[2],
          paddingBottom: insets.bottom + spacing[4],
        },
      ]}
    >
      <OnboardingProgress
        current={stepIndex + 1}
        total={ONBOARDING_STEPS.length}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          key={step.id}
          entering={FadeIn.duration(350)}
          exiting={FadeOut.duration(150)}
        >
          {step.title && (
            <Text size="3xl" weight="bold" style={styles.title}>
              {step.title}
            </Text>
          )}

          {step.description && (
            <Text size="base" muted style={styles.description}>
              {step.description}
            </Text>
          )}

          {renderStepBody(step, answers, {
            onSingleSelect: handleSingleSelect,
            onMultiToggle: handleMultiToggle,
            onTextChange: handleTextChange,
            onFieldChange: handleFieldChange,
            onSubmit: navigateNext,
          })}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton onPress={navigateNext} size="lg">
          {isLast ? "Let's go!" : 'Continue'}
        </PrimaryButton>

        {showBackButton && (
          <Button variant="ghost" onPress={() => router.back()} size="sm">
            Back
          </Button>
        )}
      </View>
    </View>
  )
}

type StepCallbacks = {
  onSingleSelect: (value: string) => void
  onMultiToggle: (value: string) => void
  onTextChange: (value: string) => void
  onFieldChange: (fieldId: string, value: string) => void
  onSubmit: () => void
}

function renderStepBody(
  step: OnboardingStep,
  answers: OnboardingAnswers,
  cb: StepCallbacks,
) {
  switch (step.kind) {
    case 'feature':
      return <FeatureBody step={step} />

    case 'singleChoice':
      return (
        <SingleChoiceBody
          step={step}
          value={(answers[step.id] as string) ?? undefined}
          onSelect={cb.onSingleSelect}
        />
      )

    case 'multiChoiceChips':
      return (
        <MultiChoiceChipsBody
          step={step}
          values={(answers[step.id] as string[]) ?? []}
          onToggle={cb.onMultiToggle}
        />
      )

    case 'text':
      return (
        <TextInputBody
          step={step}
          value={(answers[step.id] as string) ?? ''}
          onChange={cb.onTextChange}
          onSubmit={cb.onSubmit}
        />
      )

    case 'multiText':
      return (
        <MultiTextBody
          step={step}
          answers={answers}
          onFieldChange={cb.onFieldChange}
        />
      )

    case 'congratulations':
      return <CongratulationsBody step={step} />

    default:
      return null
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[6],
  },
  title: {
    textAlign: 'center',
    marginTop: spacing[6],
  },
  description: {
    textAlign: 'center',
    marginTop: spacing[2],
    paddingHorizontal: spacing[4],
  },
  footer: {
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
})
