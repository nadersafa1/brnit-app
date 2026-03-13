import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { View, StyleSheet } from 'react-native'

import { Container } from '@/components/container'
import { Button, Surface, Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

function handleClose() {
  router.back()
}

function Modal() {
  const colors = useColors()

  return (
    <Container>
      <View style={styles.content}>
        <Surface variant='secondary' padding={5} radius='sm' style={styles.surface}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
              <Ionicons name='checkmark' size={24} color={colors.white} />
            </View>
            <Text size='lg' weight='medium' style={styles.title}>
              Modal Screen
            </Text>
            <Text size='sm' muted style={styles.description}>
              This is an example modal screen for dialogs and confirmations.
            </Text>
          </View>
          <Button onPress={handleClose} size='sm'>
            Close
          </Button>
        </Surface>
      </View>
    </Container>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  surface: {
    width: '100%',
    maxWidth: 320,
  },
  iconContainer: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  title: {
    marginBottom: spacing[1],
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing[4],
  },
})

export default Modal
