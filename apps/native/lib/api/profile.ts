import { apiFetch } from './client'
import { ApiError } from './types'

export type ProfileResponse = {
  name: string
  email: string
  image: string | null
}

/**
 * Update current user profile. Sends multipart/form-data: name, file (image), and/or clearImage.
 * Returns the updated profile. On success, call session refetch so session.user reflects new data.
 */
export async function updateProfile(options: {
  name?: string
  imageUri?: string | null
  clearImage?: boolean
}): Promise<ProfileResponse> {
  const formData = new FormData()

  if (options.name !== undefined && options.name.trim() !== '') {
    formData.append('name', options.name.trim())
  }

  if (options.imageUri && typeof options.imageUri === 'string') {
    formData.append('file', {
      uri: options.imageUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as unknown as Blob)
  }

  if (options.clearImage === true) {
    formData.append('clearImage', 'true')
  }

  return apiFetch<ProfileResponse>('/api/me/profile', {
    method: 'PATCH',
    body: formData,
  })
}

/**
 * Map API error to a short user-facing message for toasts.
 */
export function getProfileErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Something went wrong'
}
