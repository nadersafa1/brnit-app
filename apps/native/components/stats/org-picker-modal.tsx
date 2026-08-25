import { Ionicons } from '@expo/vector-icons'
import { useCallback } from 'react'
import { View, StyleSheet, Modal, FlatList, Pressable } from 'react-native'
import { Text } from "@/components/ui/text";
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

export type OrgOption = { id: string; name: string }

type OrgPickerModalProps = Readonly<{
  visible: boolean
  onClose: () => void
  organizations: OrgOption[]
  selectedOrgId: string | null
  onSelect: (id: string) => void
  isLoading?: boolean
}>

export function OrgPickerModal({
  visible,
  onClose,
  organizations,
  selectedOrgId,
  onSelect,
  isLoading = false,
}: OrgPickerModalProps) {
  const colors = useColors()

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id)
      onClose()
    },
    [onSelect, onClose]
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <View
          style={[styles.modalContent, { backgroundColor: colors.card }]}
          onStartShouldSetResponder={() => true}
        >
          <Text size="lg" weight="bold" style={styles.modalTitle}>
            Select organization
          </Text>
          {organizations.length === 0 ? (
            !isLoading && (
              <Text size="sm" muted style={styles.modalEmpty}>
                No organizations
              </Text>
            )
          ) : (
            <FlatList
              data={organizations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.orgOption,
                    item.id === selectedOrgId && {
                      backgroundColor: colors.surfaceAlt,
                    },
                  ]}
                  onPress={() => handleSelect(item.id)}
                >
                  <Text size="base" weight="medium">
                    {item.name}
                  </Text>
                  {item.id === selectedOrgId && (
                    <Ionicons name="checkmark" size={20} color={colors.accent} />
                  )}
                </Pressable>
              )}
            />
          )}
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing[4],
  },
  modalContent: {
    borderRadius: radii.xl,
    padding: spacing[4],
    maxHeight: 320,
  },
  modalTitle: {
    marginBottom: spacing[4],
  },
  modalEmpty: {
    paddingVertical: spacing[4],
  },
  orgOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
  },
})
