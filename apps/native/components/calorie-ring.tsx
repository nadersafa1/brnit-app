import { View, StyleSheet } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'

interface CalorieRingProps {
  consumed: number
  goal: number
  size?: number
}

export function CalorieRing({ consumed, goal, size = 180 }: Readonly<CalorieRingProps>) {
  const colors = useColors()
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <View style={styles.container}>
      <Svg
        width={size}
        height={size}
      >
        <Defs>
          <LinearGradient
            id='progressGradient'
            x1='0%'
            y1='0%'
            x2='100%'
            y2='0%'
          >
            <Stop
              offset='0%'
              stopColor={colors.accent}
            />
            <Stop
              offset='100%'
              stopColor={colors.accentLight}
            />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceAlt}
          strokeWidth={strokeWidth}
          fill='none'
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke='url(#progressGradient)'
          strokeWidth={strokeWidth}
          fill='none'
          strokeLinecap='round'
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <View style={styles.centerContent}>
        <Text
          size='4xl'
          weight='bold'
        >
          {consumed}
        </Text>
        <Text
          size='sm'
          weight='medium'
          muted
        >
          of {goal} kcal
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center'
  }
})
