import { useQuery } from "@tanstack/react-query";
import { getConsumptionStreak } from "@/lib/api/consumption-streak";
import { memberKeys } from "@/lib/queries/keys";

/** Query hook for current consumption streak. Invalidates with memberKeys.all (e.g. on mark/unmark meal consumed). */
export function useConsumptionStreak() {
  return useQuery({
    queryKey: memberKeys.consumptionStreak(),
    queryFn: () => getConsumptionStreak(),
  });
}
