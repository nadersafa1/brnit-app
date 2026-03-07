/**
 * Build a Cloudinary URL from a public_id
 */
export function buildCloudinaryUrl(publicId: string): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  if (!cloudName) throw new Error('CLOUDINARY_CLOUD_NAME not set')
  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`
}

/**
 * Upload a file to Cloudinary (server-side)
 * Returns publicId for DB storage
 */
export async function uploadFileToCloudinary(
  file: File,
  folder: string
): Promise<{ publicId: string }> {
  const { cloudinary } = await import('./cloudinary')
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error: Error | undefined, result: { public_id: string } | undefined) => {
        if (error) {
          reject(error)
          return
        }
        if (!result?.public_id) {
          reject(new Error('Cloudinary upload returned no public_id'))
          return
        }
        resolve({ publicId: result.public_id })
      }
    )
    uploadStream.end(buffer)
  })
}

/**
 * Check if a URL is from Cloudinary
 */
export const isCloudinaryUrl = (url: string | null | undefined): boolean => {
  if (!url) return false
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com')
}

/**
 * Extract public_id from a Cloudinary URL
 * Example: https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
 * Returns: sample
 */
export const extractPublicId = (url: string): string | null => {
  if (!isCloudinaryUrl(url)) return null

  try {
    // Match pattern: /upload/[version]/[public_id].[extension]
    const match = url.match(/\/upload\/[^/]+\/([^.]+)/)
    if (match && match[1]) {
      return match[1]
    }

    // Alternative pattern: /image/upload/[public_id]
    const altMatch = url.match(/\/image\/upload\/([^/]+)/)
    if (altMatch && altMatch[1]) {
      return altMatch[1].replace(/\.[^.]+$/, '') // Remove extension
    }

    return null
  } catch {
    return null
  }
}

/**
 * Delete an image from Cloudinary by public_id
 */
export const deleteCloudinaryImage = async (publicId: string): Promise<boolean> => {
  try {
    const { cloudinary } = await import('./cloudinary')
    const result = await cloudinary.uploader.destroy(publicId)
    return result.result === 'ok'
  } catch (error) {
    console.error('Error deleting Cloudinary image:', error)
    return false
  }
}
