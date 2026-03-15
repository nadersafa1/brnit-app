import dayjs, { Dayjs } from 'dayjs'
import { View, StyleSheet } from 'react-native'

import { DayPill } from './day-pill'

export interface CalendarWeekRowProps {
  weekStart: Dayjs
  selectedDate: Date
  weekWidth: number
  dayPillWidth: number
  onDayPress: (date: Date) => void
}

/** Renders a single week row: 7 day pills. */
export function CalendarWeekRow({
  weekStart,
  selectedDate,
  weekWidth,
  dayPillWidth,
  onDayPress,
}: Readonly<CalendarWeekRowProps>) {
  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'))

  return (
    <View style={[styles.row, { width: weekWidth }]}>
      {days.map((day) => {
        const date = day.toDate()
        const isSelected = dayjs(selectedDate).isSame(day, 'day')
        return (
          <View key={day.format('YYYY-MM-DD')} style={{ width: dayPillWidth }}>
            <DayPill
              date={date}
              day={day.format('ddd')}
              isSelected={isSelected}
              onPress={() => onDayPress(date)}
            />
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
})
