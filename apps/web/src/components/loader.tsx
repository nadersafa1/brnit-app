import { Loader2Icon } from "lucide-react";

interface SpinnerProps {
	className?: string;
}

export function Spinner({ className = "size-6" }: Readonly<SpinnerProps>) {
	return (
		<Loader2Icon
			aria-hidden="true"
			className={`animate-spin text-accent-fg ${className}`}
		/>
	);
}

/** Route-level pending UI. Centred in whatever box it is dropped into. */
export default function Loader() {
	return (
		<output
			aria-live="polite"
			className="flex h-full items-center justify-center gap-2 pt-8"
		>
			<Spinner />
			<span className="sr-only">Loading</span>
		</output>
	);
}
