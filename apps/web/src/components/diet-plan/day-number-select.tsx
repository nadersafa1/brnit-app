'use client'

/**
 * Day number select for diet plan meals.
 * day_number = 0 means "repeat on all days" (displayed as "All days" / "Every day").
 * day_number >= 1 means specific day (Day 1, Day 2, ...).
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'

const MAX_DAYS = 31
/** Sentinel for Radix Select - value "0" can be mishandled, use "all" and map to 0 */
const SELECT_VALUE_ALL = 'all'
const DAY_OPTIONS = [
  { value: SELECT_VALUE_ALL, dayNumber: 0, label: 'All days (repeat every day)' },
  ...Array.from({ length: MAX_DAYS }, (_, i) => ({
    value: String(i + 1),
    dayNumber: i + 1,
    label: `Day ${i + 1}`,
  })),
]

export function formatDayNumberDisplay(dayNumber: number): string {
  if (dayNumber === 0) return 'Every day'
  return `Day ${dayNumber}`
}

interface DayNumberSelectProps {
  value: number
  onChange: (value: number) => void
  id?: string
  disabled?: boolean
  error?: string
}

export function DayNumberSelect({
  value,
  onChange,
  id = 'day-number',
  disabled = false,
  error,
}: DayNumberSelectProps) {
  const selectValue = value === 0 ? SELECT_VALUE_ALL : String(value)
  return (
    <Field>
      <FieldLabel htmlFor={id}>Day</FieldLabel>
      <Select
        value={selectValue}
        onValueChange={(v) => onChange(v === SELECT_VALUE_ALL ? 0 : Number.parseInt(v, 10))}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select day" />
        </SelectTrigger>
        <SelectContent>
          {DAY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={error ? [{ message: error }] : undefined} />
    </Field>
  )
}
