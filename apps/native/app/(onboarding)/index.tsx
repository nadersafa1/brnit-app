import { Redirect } from 'expo-router'

import { hrefOnboardingStep0 } from '@/constants/onboarding-router'

/** Group index: land on first wizard step (explicit params so `[step]` receives `step`). */
export default function OnboardingIndex() {
  return <Redirect href={hrefOnboardingStep0} />
}
