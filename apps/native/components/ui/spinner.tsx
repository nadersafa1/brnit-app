import { ActivityIndicator, ActivityIndicatorProps } from 'react-native'
import { useColors } from '@/hooks/use-theme-color'

type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps extends Omit<ActivityIndicatorProps, 'size'> {
  size?: SpinnerSize
}

const SIZE_MAP: Record<SpinnerSize, 'small' | 'large'> = {
  sm: 'small',
  md: 'small',
  lg: 'large',
}

export function Spinner({ size = 'md', color, ...props }: SpinnerProps) {
  const colors = useColors()

  return (
    <ActivityIndicator
      size={SIZE_MAP[size]}
      color={color ?? colors.accent}
      {...props}
    />
  )
}
