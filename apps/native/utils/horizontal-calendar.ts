import { Dayjs } from "dayjs";

interface WeekData {
  weekStart: Dayjs;
  id: string;
}

export const generateWeeks = (centerWeek: Dayjs, count: number): WeekData[] => {
  const halfCount = Math.floor(count / 2);
  const startWeek = centerWeek.subtract(halfCount, "week");
  const weekArray: WeekData[] = [];
  for (let i = 0; i < count; i++) {
    const week = startWeek.add(i, "week");
    weekArray.push({
      weekStart: week,
      id: week.format("YYYY-MM-DD"),
    });
  }
  return weekArray;
};