import { Button, Spinner } from "heroui-native";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof Button>;

export interface PrimaryButtonProps extends Omit<ButtonProps, "children"> {
  isLoading?: boolean;
  children: React.ReactNode;
}

/**
 * Primary action button with built-in disabled/loading contrast.
 * - Enabled: bg-accent, white label
 * - Loading: bg-accent opacity-80, shows Spinner
 * - Disabled: bg-muted, white label
 */
export function PrimaryButton({
  isLoading = false,
  isDisabled = false,
  children,
  className,
  ...rest
}: PrimaryButtonProps) {
  const disabled = isDisabled || isLoading;

  const styleClass =
    isLoading ? "rounded-full h-11 bg-accent opacity-80" : disabled ? "rounded-full h-11 bg-muted" : "rounded-full h-11 bg-accent";

  return (
    <Button
      isDisabled={disabled}
      className={[styleClass, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {isLoading ? (
        <Spinner size="sm" color="default" />
      ) : (
        <Button.Label className="text-white font-medium">{children}</Button.Label>
      )}
    </Button>
  );
}
