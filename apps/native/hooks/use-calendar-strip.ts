import dayjs, { Dayjs } from 'dayjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dimensions,
  type FlatList as FlatListType,
  type ViewToken,
} from 'react-native'

import { generateWeeks } from "@/utils/horizontal-calendar";

const INITIAL_WEEKS_COUNT = 104
const LOAD_MORE_WEEKS_COUNT = 10
const PREPEND_LOAD_THRESHOLD = 3
const APPEND_LOAD_THRESHOLD = 4

export const CALENDAR_STRIP_VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 50,
  minimumViewTime: 100,
} as const

export interface WeekData {
  weekStart: Dayjs
  id: string
}

function weeksNotInList(existing: WeekData[], newWeeks: WeekData[]): WeekData[] {
  const existingIds = new Set(existing.map((w) => w.id))
  return newWeeks.filter((w) => !existingIds.has(w.id))
}

function findWeekIndex(weeks: WeekData[], date: Dayjs): number {
  const weekStart = date.startOf('week')
  return weeks.findIndex((w) => w.weekStart.isSame(weekStart, 'day'))
}

export interface UseCalendarStripParams {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

/**
 * State and behavior for the horizontal calendar strip: weeks list,
 * scroll position, infinite load (prepend/append), and day selection.
 */
export function useCalendarStrip({
  selectedDate,
  onDateSelect,
}: Readonly<UseCalendarStripParams>) {
  const today = dayjs()
  const todayWeekStart = today.startOf('week')

  const initialWeeks = generateWeeks(todayWeekStart, INITIAL_WEEKS_COUNT)
  const todayWeekIndex = initialWeeks.findIndex((w) => w.weekStart.isSame(todayWeekStart, 'day'))
  const initialVisibleIndex =
    todayWeekIndex >= 0 ? todayWeekIndex : Math.floor(initialWeeks.length / 2)

  const [weeks, setWeeks] = useState<WeekData[]>(initialWeeks)
  const [visibleWeekIndex, setVisibleWeekIndex] = useState(initialVisibleIndex)
  const flatListRef = useRef<FlatListType<WeekData>>(null)

  const screenWidth = Dimensions.get('window').width
  const weekWidth = screenWidth - 32
  const dayPillWidth = (weekWidth - 16) / 7

  const visibleWeekStart = weeks[visibleWeekIndex]?.weekStart ?? todayWeekStart
  const isCurrentWeek = visibleWeekStart.isSame(todayWeekStart, 'day')
  const monthLabel = visibleWeekStart.format('MMMM YYYY')

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: weekWidth,
      offset: weekWidth * index,
      index,
    }),
    [weekWidth],
  )

  const scrollToWeekIndex = useCallback(
    (index: number, animated = true) => {
      if (index >= 0 && index < weeks.length) {
        flatListRef.current?.scrollToIndex({ index, animated, viewPosition: 0.5 })
        setVisibleWeekIndex(index)
      }
    },
    [weeks.length],
  )

  const jumpToToday = useCallback(() => {
    const weekIndex = findWeekIndex(weeks, today)
    if (weekIndex >= 0) scrollToWeekIndex(weekIndex)
    onDateSelect(today.toDate())
  }, [today, onDateSelect, weeks, scrollToWeekIndex])

  const handleDayPress = useCallback(
    (date: Date) => {
      onDateSelect(date)
      const weekIndex = findWeekIndex(weeks, dayjs(date))
      if (weekIndex >= 0) scrollToWeekIndex(weekIndex)
    },
    [onDateSelect, weeks, scrollToWeekIndex],
  )

  // Sync the visible week when selectedDate changes externally (e.g. swipe gesture).
  // Guarded by prevSyncedDateRef so calendar-strip scrolling and infinite-load
  // prepend/append don't snap the user back to the selected date's week.
  const prevSyncedDateRef = useRef(dayjs(selectedDate).format('YYYY-MM-DD'))
  useEffect(() => {
    const dateKey = dayjs(selectedDate).format('YYYY-MM-DD')
    if (dateKey === prevSyncedDateRef.current) return
    prevSyncedDateRef.current = dateKey

    const weekIndex = findWeekIndex(weeks, dayjs(selectedDate))
    if (weekIndex >= 0) scrollToWeekIndex(weekIndex)
  }, [selectedDate, weeks, scrollToWeekIndex])

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return
      const first = viewableItems[0]
      if (first.index === null) return

      setVisibleWeekIndex(first.index)

      // Load more weeks at the start (past) or end (future) for infinite scroll.
      if (first.index < PREPEND_LOAD_THRESHOLD) {
        const firstWeek = weeks[0].weekStart
        const newWeeks = generateWeeks(firstWeek.subtract(5, 'week'), LOAD_MORE_WEEKS_COUNT)
        const toPrepend = weeksNotInList(weeks, newWeeks)
        if (toPrepend.length > 0) setWeeks((prev) => [...toPrepend, ...prev])
      } else if (first.index > weeks.length - APPEND_LOAD_THRESHOLD) {
        const lastWeek = weeks.at(-1)?.weekStart
        if (!lastWeek) return
        const newWeeks = generateWeeks(lastWeek.add(1, 'week'), LOAD_MORE_WEEKS_COUNT)
        const toAppend = weeksNotInList(weeks, newWeeks)
        if (toAppend.length > 0) setWeeks((prev) => [...prev, ...toAppend])
      }
    },
    [weeks],
  )

  return {
    flatListRef,
    weeks,
    weekWidth,
    dayPillWidth,
    initialVisibleIndex,
    monthLabel,
    isCurrentWeek,
    jumpToToday,
    getItemLayout,
    handleDayPress,
    handleViewableItemsChanged,
  }
}
