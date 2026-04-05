import type { PatchUserPreferencesBody, UserPreferencesData } from '@burn-app/user-preferences'

import { apiFetch } from './client'

export type UserPreferencesApiResponse = {
  preferences: UserPreferencesData
  schemaVersion: number
  appSchemaVersion: number
  completion: { needsAttention: boolean; missingKeys: string[] }
  needsCatchUp: boolean
}

export async function getUserPreferences(): Promise<UserPreferencesApiResponse> {
  return apiFetch<UserPreferencesApiResponse>('/api/me/preferences')
}

export async function patchUserPreferences(
  body: PatchUserPreferencesBody
): Promise<UserPreferencesApiResponse> {
  return apiFetch<UserPreferencesApiResponse>('/api/me/preferences', {
    method: 'PATCH',
    body,
  })
}
