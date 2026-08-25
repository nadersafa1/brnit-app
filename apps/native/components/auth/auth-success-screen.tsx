import { Ionicons } from '@expo/vector-icons'
import { Link, type Href } from 'expo-router'
import { ScrollView, TouchableOpacity, View, StyleSheet, ScrollViewProps } from 'react-native'
import { Text } from "@/components/ui/text";
import { useColors, useShadows } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

export interface AuthSuccessScreenProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  backHref: Href
  backLabel: string
  contentContainerStyle?: ScrollViewProps['contentContainerStyle']
}

export function AuthSuccessScreen({ icon, title, description, backHref, backLabel, contentContainerStyle }: Readonly<AuthSuccessScreenProps>) {
  const colors = useColors()
  const elevation = useShadows()

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.appBg }]}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
    >
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: colors.pastelPurple }]}>
          <Ionicons
            name={icon}
            size={48}
            color={colors.white}
          />
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card }, elevation.lg]}>
        <Text
          size='2xl'
          weight='bold'
          style={styles.title}
        >
          {title}
        </Text>
        <Text
          size='sm'
          muted
          style={styles.description}
        >
          {description}
        </Text>
        <Link
          href={backHref}
          asChild
        >
          <TouchableOpacity>
            <Text
              size='sm'
              weight='medium'
              accent
              style={styles.link}
            >
              {backLabel}
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1
  },
  contentContainer: {
    paddingHorizontal: spacing[6],
    minHeight: '100%',
    justifyContent: 'center'
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing[8]
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    borderRadius: radii.sm,
    padding: spacing[6]
  },
  title: {
    marginBottom: spacing[2]
  },
  description: {
    marginBottom: spacing[6]
  },
  link: {
    textAlign: 'center'
  }
})
