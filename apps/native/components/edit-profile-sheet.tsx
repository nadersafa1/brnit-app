import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import { View, StyleSheet, Pressable, Image, TextInput } from 'react-native'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps
} from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { Button, Text, Spinner } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { useEditProfileForm } from '@/hooks/use-edit-profile-form'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

type EditProfileSheetProps = {
  initialName: string
  initialImageUrl: string | null
  onSaveSuccess: () => void
  onClose: () => void
}

export type EditProfileSheetRef = {
  open: () => void
  close: () => void
}

const SNAP_POINTS = ['50%', '60%', '70%', '80%']

export const EditProfileSheet = forwardRef<EditProfileSheetRef, EditProfileSheetProps>(function EditProfileSheet(
  { initialName, initialImageUrl, onSaveSuccess, onClose },
  ref
) {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  const bottomSheetRef = useRef<BottomSheet>(null)

  const close = useCallback(() => {
    bottomSheetRef.current?.close()
    onClose()
  }, [onClose])

  const form = useEditProfileForm({
    initialName,
    initialImageUrl,
    onSaveSuccess,
    closeSheet: close
  })

  const open = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0)
  }, [])

  useImperativeHandle(ref, () => ({ open, close }), [open, close])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  )

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter
        {...props}
        bottomInset={insets.bottom}
      >
        <View style={[styles.footer, { backgroundColor: colors.appBg, borderTopColor: colors.border }]}>
          <Button
            variant='outline'
            onPress={close}
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
      </BottomSheetFooter>
    ),
    [colors.appBg, colors.border, insets.bottom, close, form.isSaving, form.save]
  )

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.appBg }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <View style={styles.header}>
        <Text
          size='lg'
          weight='bold'
        >
          Edit Profile
        </Text>
      </View>

      <BottomSheetScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        <AvatarSection
          displayImageUri={form.displayImageUri}
          displayName={form.displayName}
          canRemovePhoto={form.canRemovePhoto}
          onChangePhoto={form.pickImage}
          onRemovePhoto={form.removePhoto}
          colors={colors}
        />

        <Text
          size='base'
          weight='semibold'
          style={styles.label}
        >
          Name
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.ink
            }
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
      </BottomSheetScrollView>
    </BottomSheet>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2]
  },
  content: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4]
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
    marginBottom: spacing[2]
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[4],
    height: 48,
    fontSize: 16
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
    borderTopWidth: 1
  },
  footerButton: {
    flex: 1
  }
})
