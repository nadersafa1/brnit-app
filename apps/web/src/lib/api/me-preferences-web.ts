import type { PatchUserPreferencesBody, UserPreferencesData } from '@burn-app/user-preferences'

export type MePreferencesResponse = {
  preferences: UserPreferencesData
  schemaVersion: number
  appSchemaVersion: number
  completion: { needsAttention: boolean; missingKeys: string[] }
  needsCatchUp: boolean
}

async function parseJsonOrThrow(res: Response): Promise<MePreferencesResponse> {
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const err =
      json && typeof json === 'object' && 'error' in json && typeof (json as { error: unknown }).error === 'string'
        ? (json as { error: string }).error
        : `Request failed (${res.status})`
    throw new Error(err)
  }
  return json as MePreferencesResponse
}

export async function getMePreferences(): Promise<MePreferencesResponse> {
  const res = await fetch('/api/me/preferences', {
    credentials: 'include',
  })
  return parseJsonOrThrow(res)
}

export async function patchMePreferences(body: PatchUserPreferencesBody): Promise<MePreferencesResponse> {
  const res = await fetch('/api/me/preferences', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseJsonOrThrow(res)
}
