import { Input as InputPrimitive } from "@base-ui/react/input";
import { fieldControlVariants } from "@brnit/ui/lib/field-control-variants";
import { cn } from "@brnit/ui/lib/utils";
import type * as React from "react";

function Input({
	className,
	size = "default",
	type,
	...props
}: Omit<React.ComponentProps<"input">, "size"> & {
	size?: "sm" | "default" | "lg";
}) {
	return (
		<InputPrimitive
			className={cn(
				fieldControlVariants({ size }),
				"file:inline-flex file:h-8 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm",
				className
			)}
			data-size={size}
			data-slot="input"
			type={type}
			{...props}
		/>
	);
}

export { Input };
