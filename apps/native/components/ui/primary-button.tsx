import { ViewStyle, TextStyle } from 'react-native'
import { Button, ButtonProps } from './button'

export interface PrimaryButtonProps extends Omit<ButtonProps, 'variant'> {
  isLoading?: boolean
  isDisabled?: boolean
}

export function PrimaryButton({
  isLoading = false,
  isDisabled = false,
  loading,
  disabled,
  children,
  ...props
}: PrimaryButtonProps) {
  return (
    <Button
      variant="solid"
      loading={isLoading || loading}
      disabled={isDisabled || disabled}
      {...props}
    >
      {children}
    </Button>
  )
}
