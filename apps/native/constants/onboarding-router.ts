import type { Href } from 'expo-router'

/** Single stable reference — inline objects in `<Redirect href={...} />` retrigger navigation every render. */
export const hrefOnboardingStep0: Href = {
  pathname: '/(onboarding)/[step]',
  params: { step: '0' },
}
