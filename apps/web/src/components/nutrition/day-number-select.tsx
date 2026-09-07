import { FormField } from "@brnit/ui/components/form-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@brnit/ui/components/select";

/**
 * `diet_plan_meal.day_number`.
 *
 * `0` is a **meaningful** value, not an empty one: it means the slot repeats on
 * every day of the plan. Day 1 is the assignment's `startDate`, so the numbered
 * options start there.
 */

const MAX_PLAN_DAYS = 31;
const REPEATS_EVERY_DAY = 0;

const DAY_OPTIONS = [
	{ label: "All days (repeat every day)", value: REPEATS_EVERY_DAY },
	...Array.from({ length: MAX_PLAN_DAYS }, (_, index) => ({
		label: `Day ${index + 1}`,
		value: index + 1,
	})),
];

/** How a slot's day reads in a table or a summary line. */
export function formatDayNumberDisplay(dayNumber: number): string {
	return dayNumber === REPEATS_EVERY_DAY ? "Every day" : `Day ${dayNumber}`;
}

interface DayNumberSelectProps {
	disabled?: boolean;
	id: string;
	onChange: (dayNumber: number) => void;
	value: number;
}

export function DayNumberSelect({
	disabled = false,
	id,
	onChange,
	value,
}: Readonly<DayNumberSelectProps>) {
	return (
		<FormField htmlFor={id} label="Day">
			<Select
				disabled={disabled}
				items={DAY_OPTIONS}
				onValueChange={(next: number | null) => {
					if (next !== null) {
						onChange(next);
					}
				}}
				value={value}
			>
				<SelectTrigger id={id}>
					<SelectValue placeholder="Select a day" />
				</SelectTrigger>
				<SelectContent>
					{DAY_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FormField>
	);
}
