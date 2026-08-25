import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@brnit/auth'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'
import { logger } from '@/lib/server-logger'
import {
  buildCloudinaryUrl,
  deleteCloudinaryImage,
  extractPublicId,
  uploadFileToCloudinary,
} from '@/lib/cloudinary-utils'
import { isPastDate } from '@/lib/date-utils'

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
type ProfileResponse = { name: string; email: string; image: string | null; dob: string | null }

function dobToResponseValue(
  dob: Date | string | null | undefined
): string | null {
  if (dob == null) return null
  if (dob instanceof Date) return dob.toISOString().slice(0, 10)
  return dob
}

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
 * Parses and validates PATCH /api/me/profile form data.
 * Validates DOB is a past date when provided. Returns parsed fields or an error response.
 */
function parseProfilePatchForm(
  formData: FormData
): { name?: string; dob?: string; uploadFile?: File; clearImage: boolean } | { error: NextResponse } {
  const nameRaw = formData.get('name')
  const dobRaw = formData.get('dob')
  const file = formData.get('file')
  const clearImageRaw = formData.get('clearImage')

  const name =
    typeof nameRaw === 'string' && nameRaw.trim() !== '' ? nameRaw.trim() : undefined
  const dob = typeof dobRaw === 'string' && dobRaw.trim() !== '' ? dobRaw.trim() : undefined
  const uploadFile = file instanceof File && file.size > 0 ? file : undefined
  const clearImage = clearImageRaw === 'true'

  if (dob && !isPastDate(dob)) {
    return {
      error: NextResponse.json(
        { error: 'Date of birth must be a valid past date' },
        { status: 400 }
      ),
    }
  }
  if (!name && !dob && !uploadFile && !clearImage) {
    return {
      error: NextResponse.json(
        { error: 'At least one of name, dob, image file, or clearImage must be provided' },
        { status: 400 }
      ),
    }
  }
  // All validations passed; return parsed fields for PATCH handler
  return { name, dob, uploadFile, clearImage }
}

/**
 * GET /api/me/profile
 * Returns the current user's profile (name, email, image, dob).
 * Requires an authenticated session. No side effects; read-only.
 */
async function getHandler(request: NextRequest) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const { user } = authResult.session
  const response: ProfileResponse = {
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    dob: dobToResponseValue(user.dob),
  }
  return NextResponse.json(response)
}

/**
 * PATCH /api/me/profile
 * Update current user profile. Accepts multipart/form-data:
 * - name (optional): string
 * - dob (optional): YYYY-MM-DD, must be a valid past date
 * - file (optional): image file for profile picture (replaces existing)
 * - clearImage (optional): "true" to remove profile image
 * At least one of name, dob, file, or clearImage must be provided.
 * Requires an authenticated session.
 * Note: Single updateUser call; no DB transaction needed (Better Auth handles persistence).
 */
async function patchHandler(request: NextRequest) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const sessionUser = authResult.session.user

  const formData = await request.formData()
  const parsed = parseProfilePatchForm(formData)
  if ('error' in parsed) return parsed.error

  const { name, dob, uploadFile, clearImage } = parsed
  if (uploadFile) {
    const validation = validateImageFile(uploadFile)
    if ('error' in validation) return validation.error
  }

  try {
    const previousImageUrl = sessionUser.image ?? undefined
    const imageUrl = await resolveNewImageUrl(
      uploadFile,
      clearImage,
      previousImageUrl
    )

    const updatePayload: {
      name?: string
      image?: string | null
      dob?: Date
    } = {}
    if (name !== undefined) updatePayload.name = name
    if (dob !== undefined) updatePayload.dob = new Date(dob)
    if (imageUrl !== undefined) updatePayload.image = imageUrl

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

    const response: ProfileResponse = {
      name: name ?? sessionUser.name,
      email: sessionUser.email,
      image: imageUrl === undefined ? (sessionUser.image ?? null) : imageUrl,
      dob: dob ?? dobToResponseValue(sessionUser.dob),
    }
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Profile update error', { err: error })
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

export const GET = withRequestLogging(getHandler, { actionName: 'GetProfile' })
export const PATCH = withRequestLogging(patchHandler, { actionName: 'UpdateProfile' })
