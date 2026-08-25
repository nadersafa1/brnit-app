import { Link, Stack } from 'expo-router'
import { View, StyleSheet } from 'react-native'

import { Container } from '@/components/container'
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Text } from "@/components/ui/text";
import { spacing } from '@/theme/spacing'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <Container>
        <View style={styles.content}>
          <Surface variant="secondary" padding={6} radius="sm" style={styles.surface}>
            <Text size="4xl" style={styles.emoji}>
              🤔
            </Text>
            <Text size="lg" weight="medium" style={styles.title}>
              Page Not Found
            </Text>
            <Text size="sm" muted style={styles.description}>
              The page you're looking for doesn't exist.
            </Text>
            <Link href="/" asChild>
              <Button size="sm" onPress={() => {}}>
                Go Home
              </Button>
            </Link>
          </Surface>
        </View>
      </Container>
    </>
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
    alignItems: 'center',
    maxWidth: 320,
  },
  emoji: {
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
