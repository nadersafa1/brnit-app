import { Button, type ButtonProps } from "./button";

export interface PrimaryButtonProps extends Omit<ButtonProps, "variant"> {
	isDisabled?: boolean;
	isLoading?: boolean;
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
			disabled={isDisabled || disabled}
			loading={isLoading || loading}
			variant="solid"
			{...props}
		>
			{children}
		</Button>
	);
}
