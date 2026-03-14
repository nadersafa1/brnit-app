import { useQuery } from '@tanstack/react-query'
import { apiFetch, API_ENDPOINTS } from '@/lib/api'
import { memberKeys } from '@/lib/queries/keys'
import type { FoodItemAlternativesResponse } from '@/lib/api/member-food-types'

type MealItemAlternativesQuery = {
  date?: string
  page?: number
  perPage?: number
}

function buildMealItemAlternativesUrl(
  assignmentId: string,
  dietPlanMealId: string,
  mealItemId: string,
  query: MealItemAlternativesQuery
): string {
  const params = new URLSearchParams()
  if (query.date) params.set('date', query.date)
  if (query.page != null) params.set('page', String(query.page))
  if (query.perPage != null) params.set('perPage', String(query.perPage))
  const base = API_ENDPOINTS.member.mealItemAlternatives(
    assignmentId,
    dietPlanMealId,
    mealItemId
  )
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

type UseMealItemAlternativesOptions = {
  assignmentId: string
  dietPlanMealId: string
  mealItemId: string
  date?: string
  page?: number
  perPage?: number
  enabled?: boolean
}

export function useMealItemAlternatives({
  assignmentId,
  dietPlanMealId,
  mealItemId,
  date,
  page = 1,
  perPage = 10,
  enabled = true,
}: UseMealItemAlternativesOptions) {
  const query = { date, page, perPage }
  return useQuery({
    queryKey: memberKeys.mealItemAlternatives(
      assignmentId,
      dietPlanMealId,
      mealItemId,
      query
    ),
    queryFn: () =>
      apiFetch<FoodItemAlternativesResponse>(
        buildMealItemAlternativesUrl(
          assignmentId,
          dietPlanMealId,
          mealItemId,
          query
        )
      ),
    enabled:
      enabled &&
      !!assignmentId &&
      !!dietPlanMealId &&
      !!mealItemId,
  })
}
