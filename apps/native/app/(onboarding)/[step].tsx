import { Redirect, useLocalSearchParams } from 'expo-router'

import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer'
import { ONBOARDING_STEPS } from '@/lib/onboarding/steps'

export default function OnboardingStepScreen() {
  const { step } = useLocalSearchParams<{ step: string }>()
  const stepIndex = Number(step)

  if (Number.isNaN(stepIndex) || stepIndex < 0 || stepIndex >= ONBOARDING_STEPS.length) {
    return <Redirect href="/(onboarding)/0" />
  }

  return <OnboardingContainer stepIndex={stepIndex} />
}
