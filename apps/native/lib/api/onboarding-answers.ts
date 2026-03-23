import { apiFetch } from './client'
import { API_ENDPOINTS } from './endpoints'

type OnboardingAnswersResponse = {
  data: Record<string, string | string[]>
}

export async function syncOnboardingAnswers(
  answers: Record<string, string | string[]>,
): Promise<Record<string, string | string[]>> {
  const response = await apiFetch<OnboardingAnswersResponse>(
    API_ENDPOINTS.me.onboardingAnswers,
    {
      method: 'PUT',
      body: { answers },
    },
  )
  return response.data
}

export async function fetchOnboardingAnswers(): Promise<
  Record<string, string | string[]>
> {
  const response = await apiFetch<OnboardingAnswersResponse>(
    API_ENDPOINTS.me.onboardingAnswers,
  )
  return response.data
}
