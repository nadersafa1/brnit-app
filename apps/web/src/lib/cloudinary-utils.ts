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
