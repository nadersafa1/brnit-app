'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface UseCloudinaryUploadOptions {
  folder?: string
  onSuccess?: (result: { public_id: string; secure_url: string }) => void
  onError?: (error: Error) => void
}

export const useCloudinaryUpload = (options: UseCloudinaryUploadOptions = {}) => {
  const [isUploading, setIsUploading] = useState(false)

  const uploadToCloudinary = async (
    file: File
  ): Promise<{ public_id: string; secure_url: string } | null> => {
    setIsUploading(true)

    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const signResponse = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp,
          folder: options.folder,
        }),
      })

      if (!signResponse.ok) {
        throw new Error('Failed to get upload signature')
      }

      const { signature, cloudName, apiKey } = await signResponse.json()

      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', apiKey)
      formData.append('timestamp', timestamp.toString())
      formData.append('signature', signature)
      if (options.folder) {
        formData.append('folder', options.folder)
      }

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error?.message || 'Upload failed')
      }

      const result = await uploadResponse.json()
      options.onSuccess?.(result)
      return { public_id: result.public_id, secure_url: result.secure_url }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Upload failed')
      options.onError?.(err)
      toast.error(err.message)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  return { uploadToCloudinary, isUploading }
}
