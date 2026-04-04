import { Ionicons } from '@expo/vector-icons'
import { useCallback } from 'react'
import {
  FlatList,
  type ListRenderItemInfo,
  Pressable,
  View,
  StyleSheet,
} from 'react-native'

import { CalendarWeekRow } from './calendar-week-row'
import { Text } from '@/components/ui'
import {
  CALENDAR_STRIP_VIEWABILITY_CONFIG,
  useCalendarStrip,
  type WeekData,
} from '@/hooks/use-calendar-strip'
import { useColors, useShadows } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

interface CalendarStripProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

/** Horizontal week calendar with infinite scroll (past/future) and a month header. */
export function CalendarStrip({ selectedDate, onDateSelect }: Readonly<CalendarStripProps>) {
  const colors = useColors()
  const elevation = useShadows()
  const {
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
  } = useCalendarStrip({ selectedDate, onDateSelect })

  const renderWeek = useCallback(
    (info: ListRenderItemInfo<WeekData>) => (
      <CalendarWeekRow
        weekStart={info.item.weekStart}
        selectedDate={selectedDate}
        weekWidth={weekWidth}
        dayPillWidth={dayPillWidth}
        onDayPress={handleDayPress}
      />
    ),
    [selectedDate, weekWidth, dayPillWidth, handleDayPress],
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
              elevation.sm,
            ]}
            onPress={jumpToToday}
          >
            <Ionicons name="calendar" size={16} color={colors.white} />
          </Pressable>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={weeks}
        renderItem={renderWeek}
        keyExtractor={(week) => week.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={weekWidth}
        decelerationRate="fast"
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={CALENDAR_STRIP_VIEWABILITY_CONFIG}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialVisibleIndex}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        contentContainerStyle={{ paddingHorizontal: spacing[4] }}
        windowSize={5}
        maxToRenderPerBatch={3}
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
})
