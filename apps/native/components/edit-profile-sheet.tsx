import { forwardRef, useCallback } from 'react'
import { View, StyleSheet, Pressable, Image, TextInput } from 'react-native'
import type { BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'

import { AppBottomSheet } from "@/components/bottom-sheet/app-bottom-sheet";
import { SheetFooter } from "@/components/bottom-sheet/sheet-footer";
import { DobPicker } from '@/components/dob-picker'
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useColors } from '@/hooks/use-theme-color'
import { useEditProfileForm } from '@/hooks/use-edit-profile-form'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

type EditProfileSheetProps = {
  initialName: string
  /** ISO date string or Date (e.g. from session). */
  initialDob: string | Date | null
  initialImageUrl: string | null
  onSaveSuccess: () => void
  /** Called when the sheet is dismissed. Optional; sheet can be closed via ref. */
  onClose?: () => void
}

export type EditProfileSheetRef = {
  open: (snapIndex?: number) => void
  close: () => void
}

export const EditProfileSheet = forwardRef<EditProfileSheetRef, EditProfileSheetProps>(function EditProfileSheet(
  { initialName, initialDob, initialImageUrl, onSaveSuccess, onClose },
  ref
) {
  const colors = useColors()

  const closeSheet = useCallback(() => {
    if (typeof ref === 'object' && ref?.current) ref.current.close()
  }, [ref])

  const form = useEditProfileForm({
    initialName,
    initialDob,
    initialImageUrl,
    onSaveSuccess,
    closeSheet,
  })

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <SheetFooter {...props}>
        <View style={styles.footer}>
          <Button
            variant='outline'
            onPress={closeSheet}
            disabled={form.isSaving}
            style={styles.footerButton}
          >
            Cancel
          </Button>
          <Button
            onPress={form.save}
            disabled={form.isSaving}
            style={styles.footerButton}
          >
            {form.isSaving ? <Spinner size='sm' /> : 'Save'}
          </Button>
        </View>
      </SheetFooter>
    ),
    [closeSheet, form.isSaving, form.save]
  )

  return (
    <AppBottomSheet
      ref={ref}
      headerTitle='Edit Profile'
      onClose={onClose}
      footerComponent={renderFooter}
      keyboardShouldPersistTaps
    >
      <AvatarSection
        displayImageUri={form.displayImageUri}
        displayName={form.displayName}
        canRemovePhoto={form.canRemovePhoto}
        onChangePhoto={form.pickImage}
        onRemovePhoto={form.removePhoto}
        colors={colors}
      />

      <Text size='base' weight='semibold' style={styles.label}>
        Name
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.ink,
          },
        ]}
        placeholder='Your name'
        placeholderTextColor={colors.muted}
        value={form.name}
        onChangeText={form.setName}
        maxLength={form.nameMaxLength}
        editable={!form.isSaving}
        accessibilityLabel='Name'
        accessibilityHint='Enter your display name'
      />

      <Text size='base' weight='semibold' style={[styles.label, styles.labelTop]}>
        Date of birth
      </Text>
      <DobPicker
        value={form.dob}
        onChange={form.setDob}
        placeholder='Select date of birth'
        disabled={form.isSaving}
      />
    </AppBottomSheet>
  )
})

EditProfileSheet.displayName = 'EditProfileSheet'

// --- Avatar block (photo + change/remove actions) ---

type AvatarSectionProps = {
  displayImageUri: string | null
  displayName: string
  canRemovePhoto: boolean
  onChangePhoto: () => void
  onRemovePhoto: () => void
  colors: ReturnType<typeof useColors>
}

function AvatarSection({ displayImageUri, displayName, canRemovePhoto, onChangePhoto, onRemovePhoto, colors }: Readonly<AvatarSectionProps>) {
  return (
    <View style={styles.avatarSection}>
      <View style={[styles.avatarLarge, { backgroundColor: colors.accent }]}>
        {displayImageUri ? (
          <Image
            source={{ uri: displayImageUri }}
            style={styles.avatarImage}
          />
        ) : (
          <Text
            size='3xl'
            weight='bold'
            style={{ color: colors.white }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.avatarActions}>
        <Pressable
          onPress={onChangePhoto}
          style={({ pressed }) => [styles.avatarButton, { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.8 : 1 }]}
          accessibilityLabel='Change profile photo'
          accessibilityRole='button'
        >
          <Ionicons
            name='image-outline'
            size={18}
            color={colors.ink}
          />
          <Text
            size='sm'
            weight='medium'
          >
            Change photo
          </Text>
        </Pressable>
        {canRemovePhoto && (
          <Pressable
            onPress={onRemovePhoto}
            style={({ pressed }) => [styles.avatarButton, { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.8 : 1 }]}
            accessibilityLabel='Remove profile photo'
            accessibilityRole='button'
          >
            <Ionicons
              name='trash-outline'
              size={18}
              color={colors.danger}
            />
            <Text
              size='sm'
              weight='medium'
              danger
            >
              Remove photo
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

// --- Styles ---

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'column',
    gap: spacing[3]
  },
  footerButton: {
    flex: 1
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing[5]
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  avatarActions: {
    flexDirection: 'row',
    gap: spacing[3]
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.lg
  },
  label: {
    marginBottom: spacing[2],
  },
  labelTop: {
    marginTop: spacing[4],
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[4],
    height: 48,
    fontSize: 16
  }
})
