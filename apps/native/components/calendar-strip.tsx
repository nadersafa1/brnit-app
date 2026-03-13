import { Ionicons } from '@expo/vector-icons'
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import dayjs, { Dayjs } from 'dayjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Dimensions, Pressable, View, StyleSheet } from 'react-native'

import { DayPill } from './day-pill'
import { Text } from '@/components/ui'
import { generateWeeks } from '@/utils'
import { useColors } from '@/hooks/use-theme-color'
import { Colors } from '@/theme/colors'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'

interface CalendarStripProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

interface WeekData {
  weekStart: Dayjs
  id: string
}

export function CalendarStrip({ selectedDate, onDateSelect }: CalendarStripProps) {
  const colors = useColors()
  const today = dayjs()
  const todayWeekStart = today.startOf('week')
  const initialWeeks = generateWeeks(todayWeekStart, 20)

  const todayWeekIndex = initialWeeks.findIndex((w) => w.weekStart.isSame(todayWeekStart, 'day'))
  const initialVisibleIndex = todayWeekIndex >= 0 ? todayWeekIndex : Math.floor(initialWeeks.length / 2)

  const [weeks, setWeeks] = useState<WeekData[]>(initialWeeks)
  const [visibleWeekIndex, setVisibleWeekIndex] = useState(initialVisibleIndex)
  const hasScrolledToToday = useRef(false)

  const flashListRef = useRef<FlashListRef<WeekData>>(null)
  const screenWidth = Dimensions.get('window').width
  const weekWidth = screenWidth - 32
  const dayPillWidth = (weekWidth - 16) / 7

  useEffect(() => {
    if (!hasScrolledToToday.current && flashListRef.current) {
      hasScrolledToToday.current = true
      setTimeout(() => {
        flashListRef.current?.scrollToIndex({
          index: initialVisibleIndex,
          animated: false,
          viewPosition: 0.5,
        })
      }, 100)
    }
  }, [initialVisibleIndex])

  const visibleWeekStart = weeks[visibleWeekIndex]?.weekStart || todayWeekStart
  const isCurrentWeek = visibleWeekStart.isSame(todayWeekStart, 'day')
  const monthLabel = visibleWeekStart.format('MMMM YYYY')

  const scrollToWeekIndex = useCallback(
    (index: number, animated = true) => {
      if (index >= 0 && index < weeks.length) {
        flashListRef.current?.scrollToIndex({
          index,
          animated,
          viewPosition: 0.5,
        })
        setVisibleWeekIndex(index)
      }
    },
    [weeks.length]
  )

  const jumpToToday = useCallback(() => {
    const weekIndex = weeks.findIndex((w) => w.weekStart.isSame(todayWeekStart, 'day'))
    if (weekIndex >= 0) {
      scrollToWeekIndex(weekIndex)
    }
    onDateSelect(today.toDate())
  }, [today, todayWeekStart, onDateSelect, weeks, scrollToWeekIndex])

  const mergeWeeksWithoutDuplicates = useCallback(
    (existing: WeekData[], newWeeks: WeekData[]): WeekData[] => {
      const existingIds = new Set(existing.map((w) => w.id))
      return newWeeks.filter((w) => !existingIds.has(w.id))
    },
    []
  )

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) {
        const firstViewable = viewableItems[0]
        if (firstViewable.index !== null) {
          setVisibleWeekIndex(firstViewable.index)

          if (firstViewable.index < 3) {
            const firstWeek = weeks[0].weekStart
            const newWeeks = generateWeeks(firstWeek.subtract(10, 'week'), 10)
            const uniqueNewWeeks = mergeWeeksWithoutDuplicates(weeks, newWeeks)

            if (uniqueNewWeeks.length > 0) {
              setWeeks((prev) => {
                const merged = [...uniqueNewWeeks, ...prev]
                setVisibleWeekIndex((prevIndex) => prevIndex + uniqueNewWeeks.length)
                return merged
              })
            }
          } else if (firstViewable.index > weeks.length - 4) {
            const lastWeek = weeks[weeks.length - 1].weekStart
            const newWeeks = generateWeeks(lastWeek.add(1, 'week'), 10)
            const uniqueNewWeeks = mergeWeeksWithoutDuplicates(weeks, newWeeks)

            if (uniqueNewWeeks.length > 0) {
              setWeeks((prev) => [...prev, ...uniqueNewWeeks])
            }
          }
        }
      }
    },
    [weeks, mergeWeeksWithoutDuplicates]
  )

  const renderWeek = useCallback(
    ({ item }: { item: WeekData }) => {
      const weekDays = Array.from({ length: 7 }, (_, i) => item.weekStart.add(i, 'day'))

      return (
        <View style={[styles.weekRow, { width: weekWidth }]}>
          {weekDays.map((day) => {
            const dayDate = day.toDate()
            const isSelected = dayjs(selectedDate).isSame(day, 'day')

            return (
              <View key={day.format('YYYY-MM-DD')} style={{ width: dayPillWidth }}>
                <DayPill
                  date={dayDate}
                  day={day.format('ddd')}
                  isSelected={isSelected}
                  onPress={() => {
                    onDateSelect(dayDate)
                    const selectedWeekStart = dayjs(dayDate).startOf('week')
                    const weekIndex = weeks.findIndex((w) => w.weekStart.isSame(selectedWeekStart, 'day'))
                    if (weekIndex >= 0) {
                      scrollToWeekIndex(weekIndex)
                    }
                  }}
                />
              </View>
            )
          })}
        </View>
      )
    },
    [selectedDate, weekWidth, dayPillWidth, weeks, scrollToWeekIndex, onDateSelect]
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text size="base" weight="semibold" style={styles.monthLabel}>
          {monthLabel}
        </Text>

        {!isCurrentWeek && (
          <Pressable
            style={({ pressed }) => [
              styles.todayButton,
              { backgroundColor: colors.accent, transform: [{ scale: pressed ? 0.95 : 1 }] },
              shadows.sm,
            ]}
            onPress={jumpToToday}
          >
            <Ionicons name="calendar" size={16} color={colors.white} />
          </Pressable>
        )}
      </View>

      <FlashList
        ref={flashListRef}
        data={weeks}
        renderItem={renderWeek}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={weekWidth}
        decelerationRate="fast"
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
          minimumViewTime: 100,
        }}
        contentContainerStyle={{ paddingHorizontal: spacing[4] }}
        getItemType={() => 'week'}
        drawDistance={weekWidth * 2}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
    paddingHorizontal: spacing[2],
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
  },
  todayButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[2],
  },
  weekRow: {
    flexDirection: 'row',
  },
})
