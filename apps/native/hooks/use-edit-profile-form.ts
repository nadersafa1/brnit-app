import { useCallback, useEffect, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'

import { showError, showSuccess } from '@/lib/feedback'
import { updateProfile, getProfileErrorMessage } from '@/lib/api/profile'

const NAME_MAX_LENGTH = 200

export type UseEditProfileFormParams = {
  initialName: string
  initialImageUrl: string | null
  onSaveSuccess: () => void
  closeSheet: () => void
}

/**
 * Form state and handlers for the edit profile bottom sheet.
 * Resets local state when initial values change (e.g. when sheet is opened with fresh session data).
 */
export function useEditProfileForm({ initialName, initialImageUrl, onSaveSuccess, closeSheet }: UseEditProfileFormParams) {
  const [name, setName] = useState(initialName)
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null)
  const [userChoseRemove, setUserChoseRemove] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const displayImageUri = userChoseRemove ? null : (selectedImageUri ?? initialImageUrl)
  const displayName = name.trim() || 'User'
  const hasImageChange = selectedImageUri !== null || userChoseRemove

  useEffect(() => {
    setName(initialName)
    setSelectedImageUri(null)
    setUserChoseRemove(false)
  }, [initialName, initialImageUrl])

  const requestMediaPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      showError('Permission needed', 'Allow photo library access to change your profile photo.')
      return false
    }
    return true
  }, [])

  const pickImage = useCallback(async () => {
    const allowed = await requestMediaPermission()
    if (!allowed) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    })

    if (result.canceled) return
    const uri = result.assets[0]?.uri
    if (uri) {
      setSelectedImageUri(uri)
      setUserChoseRemove(false)
    }
  }, [requestMediaPermission])

  const removePhoto = useCallback(() => {
    setSelectedImageUri(null)
    setUserChoseRemove(true)
  }, [])

  const save = useCallback(async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      showError('Name required', 'Please enter your name.')
      return
    }
    if (trimmedName.length > NAME_MAX_LENGTH) {
      showError('Name too long', `Name must be ${NAME_MAX_LENGTH} characters or less.`)
      return
    }

    const hasChange = trimmedName !== initialName || hasImageChange
    if (!hasChange) {
      closeSheet()
      return
    }

    setIsSaving(true)
    try {
      await updateProfile({
        name: trimmedName,
        imageUri: selectedImageUri ?? undefined,
        clearImage: userChoseRemove ? true : undefined
      })
      onSaveSuccess()
      showSuccess('Profile updated', 'Your changes have been saved.')
      closeSheet()
    } catch (err) {
      showError('Update failed', getProfileErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }, [name, initialName, selectedImageUri, userChoseRemove, hasImageChange, onSaveSuccess, closeSheet])

  return {
    name,
    setName,
    displayImageUri,
    displayName,
    hasImageChange,
    isSaving,
    pickImage,
    removePhoto,
    save,
    canRemovePhoto: (initialImageUrl != null || selectedImageUri != null) && !userChoseRemove,
    nameMaxLength: NAME_MAX_LENGTH
  }
}
