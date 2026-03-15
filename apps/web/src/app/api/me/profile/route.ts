import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@burn-app/auth'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import {
  buildCloudinaryUrl,
  deleteCloudinaryImage,
  extractPublicId,
  uploadFileToCloudinary,
} from '@/lib/cloudinary-utils'

export const dynamic = 'force-dynamic'

const PROFILE_IMAGE_FOLDER = 'profile'
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

/** Profile response shape returned by GET and PATCH. */
type ProfileResponse = { name: string; email: string; image: string | null }

/**
 * Validates profile image file: size and MIME type.
 * Returns an error response to return to the client, or { ok: true }.
 */
function validateImageFile(
  file: File
): { error: NextResponse } | { ok: true } {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      error: NextResponse.json(
        { error: 'Image must be 5 MB or smaller' },
        { status: 400 }
      ),
    }
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      error: NextResponse.json(
        { error: 'Image must be JPEG, PNG, WebP, or GIF' },
        { status: 400 }
      ),
    }
  }
  return { ok: true }
}

/**
 * Deletes the previous profile image from Cloudinary if the URL is a Cloudinary URL.
 * No-op if url is undefined or not a Cloudinary URL. Used to avoid orphaned assets.
 */
async function deletePreviousProfileImageIfCloudinary(
  url: string | undefined
): Promise<void> {
  if (!url) return
  const publicId = extractPublicId(url)
  if (publicId) await deleteCloudinaryImage(publicId)
}

/**
 * Resolves the new profile image URL: upload new file and/or clear existing.
 * - If uploadFile: uploads to Cloudinary and deletes previous image (in parallel when possible).
 * - If clearImage: deletes previous image and returns null.
 * - Otherwise: returns undefined (no change to image).
 */
async function resolveNewImageUrl(
  uploadFile: File | undefined,
  clearImage: boolean,
  previousImageUrl: string | undefined
): Promise<string | null | undefined> {
  if (uploadFile) {
    const [uploadResult] = await Promise.all([
      uploadFileToCloudinary(uploadFile, PROFILE_IMAGE_FOLDER),
      deletePreviousProfileImageIfCloudinary(previousImageUrl),
    ])
    return buildCloudinaryUrl(uploadResult.publicId)
  }
  if (clearImage) {
    await deletePreviousProfileImageIfCloudinary(previousImageUrl)
    return null
  }
  return undefined
}

/**
 * Parses PATCH /api/me/profile form data. Returns parsed fields or an error response.
 */
function parseProfilePatchForm(
  formData: FormData
): { name?: string; uploadFile?: File; clearImage: boolean } | { error: NextResponse } {
  const nameRaw = formData.get('name')
  const file = formData.get('file')
  const clearImageRaw = formData.get('clearImage')

  const name =
    typeof nameRaw === 'string' && nameRaw.trim() !== '' ? nameRaw.trim() : undefined
  const uploadFile = file instanceof File && file.size > 0 ? file : undefined
  const clearImage = clearImageRaw === 'true'

  if (!name && !uploadFile && !clearImage) {
    return {
      error: NextResponse.json(
        { error: 'At least one of name, image file, or clearImage must be provided' },
        { status: 400 }
      ),
    }
  }
  return { name, uploadFile, clearImage }
}

/**
 * GET /api/me/profile
 * Returns the current user's profile (name, email, image).
 * Requires an authenticated session.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const { user } = authResult.session
  const response: ProfileResponse = {
    name: user.name,
    email: user.email,
    image: user.image ?? null,
  }
  return NextResponse.json(response)
}

/**
 * PATCH /api/me/profile
 * Update current user profile. Accepts multipart/form-data:
 * - name (optional): string
 * - file (optional): image file for profile picture (replaces existing)
 * - clearImage (optional): "true" to remove profile image
 * At least one of name, file, or clearImage must be provided.
 * Requires an authenticated session.
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const sessionUser = authResult.session.user

  // --- Parse and validate request body ---
  const formData = await request.formData()
  const parsed = parseProfilePatchForm(formData)
  if ('error' in parsed) return parsed.error

  const { name, uploadFile, clearImage } = parsed
  if (uploadFile) {
    const validation = validateImageFile(uploadFile)
    if ('error' in validation) return validation.error
  }

  try {
    // --- Resolve new image URL: upload and/or clear previous (parallel where safe) ---
    const previousImageUrl = sessionUser.image ?? undefined
    const imageUrl = await resolveNewImageUrl(
      uploadFile,
      clearImage,
      previousImageUrl
    )

    const updatePayload: { name?: string; image?: string | null } = {}
    if (name !== undefined) updatePayload.name = name
    if (imageUrl !== undefined) updatePayload.image = imageUrl

    // --- Persist via Better Auth (single user update; no multi-step DB transaction) ---
    const updateResult = await auth.api.updateUser({
      headers: request.headers,
      body: updatePayload,
    })

    if (!updateResult) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Return the updated profile from the values we applied (session is not yet refreshed with new user data).
    const response: ProfileResponse = {
      name: name ?? sessionUser.name,
      email: sessionUser.email,
      image: imageUrl === undefined ? (sessionUser.image ?? null) : imageUrl,
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
