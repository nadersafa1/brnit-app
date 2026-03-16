import { useQuery } from "@tanstack/react-query";
import { getRecentAssessments } from "@/lib/api/recent-assessments";
import { memberKeys } from "@/lib/queries/keys";

const DEFAULT_LIMIT = 5;

/** Query hook for recent body-composition assessments. Pass orgId to scope by org. */
export function useRecentAssessments(options?: {
  limit?: number;
  orgId?: string | null;
}) {
  const { limit = DEFAULT_LIMIT, orgId } = options ?? {};
  return useQuery({
    queryKey: memberKeys.recentAssessments({ limit, orgId: orgId ?? undefined }),
    queryFn: () =>
      getRecentAssessments({
        limit,
        orgId: orgId ?? undefined,
      }),
  });
}
