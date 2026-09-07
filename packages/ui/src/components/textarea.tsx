import { fieldControlVariants } from "@brnit/ui/lib/field-control-variants";
import { cn } from "@brnit/ui/lib/utils";
import type * as React from "react";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			className={cn(
				fieldControlVariants({ shape: "block" }),
				"field-sizing-content h-auto min-h-28 py-3",
				className
			)}
			data-slot="textarea"
			{...props}
		/>
	);
}

export { Textarea };
