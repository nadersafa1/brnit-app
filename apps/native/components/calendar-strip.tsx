import { Ionicons } from "@expo/vector-icons";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import dayjs, { Dayjs } from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, Text, View, type ViewToken } from "react-native";

import { DayPill } from "./day-pill";
import { generateWeeks } from "@/utils";

interface CalendarStripProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

interface WeekData {
  weekStart: Dayjs;
  id: string;
}

export function CalendarStrip({ selectedDate, onDateSelect }: CalendarStripProps) {
  const today = dayjs();
  const todayWeekStart = today.startOf("week");
  const initialWeeks = generateWeeks(todayWeekStart, 20);
  
  // Find today's week index in initial array
  const todayWeekIndex = initialWeeks.findIndex((w) => w.weekStart.isSame(todayWeekStart, "day"));
  const initialVisibleIndex = todayWeekIndex >= 0 ? todayWeekIndex : Math.floor(initialWeeks.length / 2);
  
  const [weeks, setWeeks] = useState<WeekData[]>(initialWeeks);
  const [visibleWeekIndex, setVisibleWeekIndex] = useState(initialVisibleIndex);
  const hasScrolledToToday = useRef(false);

  const flashListRef = useRef<FlashListRef<WeekData>>(null);
  const screenWidth = Dimensions.get("window").width;
  const weekWidth = screenWidth - 32; // Screen width minus horizontal padding
  const dayPillWidth = (weekWidth - 16) / 7; // Week width minus margins, divided by 7 days

  // Scroll to today's week on first load
  useEffect(() => {
    if (!hasScrolledToToday.current && flashListRef.current) {
      hasScrolledToToday.current = true;
      // Small delay to ensure FlashList is ready
      setTimeout(() => {
        flashListRef.current?.scrollToIndex({
          index: initialVisibleIndex,
          animated: false,
          viewPosition: 0.5,
        });
      }, 100);
    }
  }, [initialVisibleIndex]);

  // Get visible week start
  const visibleWeekStart = weeks[visibleWeekIndex]?.weekStart || todayWeekStart;

  // Check if visible week contains today
  const isCurrentWeek = visibleWeekStart.isSame(todayWeekStart, "day");

  const monthLabel = visibleWeekStart.format("MMMM YYYY");

  // Scroll to a specific week index
  const scrollToWeekIndex = useCallback(
    (index: number, animated = true) => {
      if (index >= 0 && index < weeks.length) {
        flashListRef.current?.scrollToIndex({
          index,
          animated,
          viewPosition: 0.5, // Center the item
        });
        setVisibleWeekIndex(index);
      }
    },
    [weeks.length]
  );

  // Jump to today
  const jumpToToday = useCallback(() => {
    const weekIndex = weeks.findIndex((w) => w.weekStart.isSame(todayWeekStart, "day"));
    if (weekIndex >= 0) {
      scrollToWeekIndex(weekIndex);
    }
    onDateSelect(today.toDate());
  }, [today, todayWeekStart, onDateSelect, weeks, scrollToWeekIndex]);

  // Helper function to merge weeks without duplicates
  const mergeWeeksWithoutDuplicates = useCallback(
    (existing: WeekData[], newWeeks: WeekData[]): WeekData[] => {
      const existingIds = new Set(existing.map((w) => w.id));
      const uniqueNewWeeks = newWeeks.filter((w) => !existingIds.has(w.id));
      return uniqueNewWeeks;
    },
    []
  );

  // Handle viewable items changed for infinite scroll and month update
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const firstViewable = viewableItems[0];
        if (firstViewable.index !== null) {
          setVisibleWeekIndex(firstViewable.index);

          // Load more weeks if approaching boundaries
          if (firstViewable.index < 3) {
            // Near start, prepend weeks
            const firstWeek = weeks[0].weekStart;
            const newWeeks = generateWeeks(firstWeek.subtract(10, "week"), 10);
            const uniqueNewWeeks = mergeWeeksWithoutDuplicates(weeks, newWeeks);
            
            if (uniqueNewWeeks.length > 0) {
              setWeeks((prev) => {
                const merged = [...uniqueNewWeeks, ...prev];
                // Adjust index after prepending
                setVisibleWeekIndex((prevIndex) => prevIndex + uniqueNewWeeks.length);
                return merged;
              });
            }
          } else if (firstViewable.index > weeks.length - 4) {
            // Near end, append weeks
            const lastWeek = weeks[weeks.length - 1].weekStart;
            const newWeeks = generateWeeks(lastWeek.add(1, "week"), 10);
            const uniqueNewWeeks = mergeWeeksWithoutDuplicates(weeks, newWeeks);
            
            if (uniqueNewWeeks.length > 0) {
              setWeeks((prev) => [...prev, ...uniqueNewWeeks]);
            }
          }
        }
      }
    },
    [weeks, mergeWeeksWithoutDuplicates]
  );

  // Render week item
  const renderWeek = useCallback(
    ({ item }: { item: WeekData }) => {
      const weekDays = Array.from({ length: 7 }, (_, i) => item.weekStart.add(i, "day"));

      return (
        <View className="flex-row" style={{ width: weekWidth }}>
          {weekDays.map((day) => {
            const dayDate = day.toDate();
            const isSelected = dayjs(selectedDate).isSame(day, "day");

            return (
              <View key={day.format("YYYY-MM-DD")} style={{ width: dayPillWidth }}>
                <DayPill
                  date={dayDate}
                  day={day.format("ddd")}
                  isSelected={isSelected}
                  onPress={() => {
                    onDateSelect(dayDate);
                    // Find and scroll to the week containing the selected date
                    const selectedWeekStart = dayjs(dayDate).startOf("week");
                    const weekIndex = weeks.findIndex((w) => w.weekStart.isSame(selectedWeekStart, "day"));
                    if (weekIndex >= 0) {
                      scrollToWeekIndex(weekIndex);
                    }
                  }}
                />
              </View>
            );
          })}
        </View>
      );
    },
    [selectedDate, weekWidth, dayPillWidth, weeks, scrollToWeekIndex, onDateSelect]
  );

  return (
    <View className="mb-4">
      {/* Compact Month Header with Today Button */}
      <View className="flex-row items-center justify-between mb-3 px-2">
        <Text className="text-base font-semibold text-ink flex-1 text-center">{monthLabel}</Text>

        {/* Today Button as Icon */}
        {!isCurrentWeek && (
          <Pressable
            className="w-8 h-8 rounded-full items-center justify-center bg-accent shadow-sm active:scale-95 ml-2"
            onPress={jumpToToday}
          >
            <Ionicons name="calendar" size={16} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      {/* Horizontal FlashList Week View */}
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
        contentContainerStyle={{ paddingHorizontal: 16 }}
        getItemType={() => "week"}
        drawDistance={weekWidth * 2}
      />
    </View>
  );
}
