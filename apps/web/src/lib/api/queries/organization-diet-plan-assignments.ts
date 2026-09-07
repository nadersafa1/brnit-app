import type {
	DietPlanAssignmentWithMealTimesDto,
	MealTimeOverrideDto,
	MealTimeOverrideInput,
	PaginatedResponse,
} from "@brnit/api";
import { MAX_PER_PAGE } from "@brnit/api/pagination/offset";
import type { UtcDateString } from "@brnit/datetime";
import { queryOptions } from "@tanstack/react-query";

import { fetchApiJson } from "@/lib/api/client";
import { dietPlanAssignmentsQueryKey } from "@/lib/api/query-keys";

/**
 * Diet-plan assignments, read and written through the **nutritionist** tree
 * (`/api/nutritionist/diet-plan-assignments`). The server forces
 * `organizationId` to the caller's active organization, which is why every
 * query here is keyed on that id rather than sending it.
 *
 * The read is **organization-wide**, and each member screen selects its own
 * rows out of it. That is a deliberate consequence of the key:
 * `dietPlanAssignmentsQueryKey` carries the organization and the page, but no
 * member, so a server-side `?memberId=` filter could not be keyed apart from
 * this one and two members would share a cache entry. One list per
 * organization also means a new assignment refreshes every screen showing it.
 */

const ASSIGNMENTS_PATH = "/api/nutritionist/diet-plan-assignments";

/** The key's page window. The reader walks past it — see `loadAllAssignments`. */
const ASSIGNMENT_LIST_FILTERS = {
	page: 1,
	perPage: MAX_PER_PAGE,
} as const;

/**
 * Stops a paging bug from turning into an unbounded request loop. At the
 * server's 100-row ceiling this is 5000 assignments, well past any real
 * organization (`membershipLimit` is 100).
 */
const MAX_ASSIGNMENT_PAGES = 50;

export type DietPlanAssignmentListResponse =
	PaginatedResponse<DietPlanAssignmentWithMealTimesDto>;

function assignmentPath(assignmentId: string): string {
	return `${ASSIGNMENTS_PATH}/${encodeURIComponent(assignmentId)}`;
}

function assignmentPageUrl(page: number): string {
	return `${ASSIGNMENTS_PATH}?page=${page}&perPage=${ASSIGNMENT_LIST_FILTERS.perPage}&sortBy=startDate&sortOrder=asc`;
}

/**
 * Every assignment in the organization, oldest window first.
 *
 * The endpoint pages at 100, and the member screens filter this list rather
 * than asking the server for one member's rows, so stopping at the first page
 * would silently hide assignments once an organization has been running for a
 * while. Pages are fetched in sequence because the count is only known from the
 * first response.
 */
async function loadAllAssignments(): Promise<
	DietPlanAssignmentWithMealTimesDto[]
> {
	const first = await fetchApiJson<DietPlanAssignmentListResponse>(
		assignmentPageUrl(ASSIGNMENT_LIST_FILTERS.page)
	);
	const rows = [...first.data];
	const lastPage = Math.min(first.pagination.totalPages, MAX_ASSIGNMENT_PAGES);

	for (let page = ASSIGNMENT_LIST_FILTERS.page + 1; page <= lastPage; page++) {
		const next = await fetchApiJson<DietPlanAssignmentListResponse>(
			assignmentPageUrl(page)
		);
		rows.push(...next.data);
	}

	return rows;
}

/**
 * `enabled` is the caller's "the session is scoped to this organization yet"
 * flag: the endpoint reads the active organization from the session, so firing
 * it before `setActive` lands would return another organization's rows under
 * this organization's key.
 */
export function dietPlanAssignmentsQueryOptions(
	organizationId: string,
	enabled = true
) {
	return queryOptions({
		enabled: enabled && organizationId.length > 0,
		meta: { showErrorToast: true },
		queryFn: () => loadAllAssignments(),
		queryKey: dietPlanAssignmentsQueryKey(
			organizationId,
			ASSIGNMENT_LIST_FILTERS
		),
	});
}

// ---------------------------------------------------------------------------
// Meal-time overrides
// ---------------------------------------------------------------------------

/** The subset of a plan slot the override editor needs. */
export interface PlanMealDefaultTime {
	id: string;
	scheduledTime?: string | null;
}

/**
 * Turns the editor's `HH:mm` field map into the wire payload.
 *
 * Only entries that **differ from the plan's own default** are sent, because
 * the server deletes and re-inserts the future-only rows for exactly the meals
 * it is given. A cleared field becomes `scheduledTime: null`, which is not "no
 * change" — it means "drop the override so the plan default applies again"
 * (`docs/migration/api-surface.md` §8.3).
 */
export function buildMealTimeOverridesPayload(
	planMeals: readonly PlanMealDefaultTime[],
	timesByMealId: Readonly<Record<string, string>>
): MealTimeOverrideInput[] {
	const payload: MealTimeOverrideInput[] = [];
	for (const meal of planMeals) {
		const raw = timesByMealId[meal.id] ?? "";
		const current = raw === "" ? null : raw;
		const planDefault = meal.scheduledTime ?? null;
		if (current !== planDefault) {
			payload.push({ dietPlanMealId: meal.id, scheduledTime: current });
		}
	}
	return payload;
}

/**
 * The starting values for the editor's `HH:mm` fields.
 *
 * The assignment's own future-only override wins, otherwise the plan slot's
 * default, otherwise blank. Seeding from the plan default (rather than from
 * blank) is what makes {@link buildMealTimeOverridesPayload} send nothing for a
 * form the user never touched.
 */
export function mealTimeFieldMapFromPlanAndOverrides(
	planMeals: readonly PlanMealDefaultTime[],
	overrides: readonly MealTimeOverrideDto[]
): Record<string, string> {
	const overrideByMealId = new Map(
		overrides.map((override) => [
			override.dietPlanMealId,
			override.scheduledTime,
		])
	);
	const fields: Record<string, string> = {};
	for (const meal of planMeals) {
		fields[meal.id] = overrideByMealId.get(meal.id) ?? meal.scheduledTime ?? "";
	}
	return fields;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface CreateDietPlanAssignmentInput {
	dietPlanId: string;
	endDate: UtcDateString;
	mealTimeOverrides: MealTimeOverrideInput[];
	memberId: string;
	startDate: UtcDateString;
}

export interface UpdateDietPlanAssignmentInput {
	endDate: UtcDateString;
	mealTimeOverrides: MealTimeOverrideInput[];
	startDate: UtcDateString;
}

/**
 * A person may hold at most one plan covering any given day, **org-wide**; the
 * server answers 409 when the window overlaps. That check is deliberately not
 * mirrored here — the client cannot see assignments in other organizations, so
 * a local guess would either be wrong or duplicate a rule that would then drift.
 */
export async function createDietPlanAssignment(
	input: CreateDietPlanAssignmentInput
): Promise<DietPlanAssignmentWithMealTimesDto> {
	const response = await fetchApiJson<{
		data: DietPlanAssignmentWithMealTimesDto;
	}>(ASSIGNMENTS_PATH, {
		body: JSON.stringify(input),
		method: "POST",
	});
	return response.data;
}

export async function updateDietPlanAssignment(
	assignmentId: string,
	input: UpdateDietPlanAssignmentInput
): Promise<DietPlanAssignmentWithMealTimesDto> {
	const response = await fetchApiJson<{
		data: DietPlanAssignmentWithMealTimesDto;
	}>(assignmentPath(assignmentId), {
		body: JSON.stringify(input),
		method: "PATCH",
	});
	return response.data;
}

export function deleteDietPlanAssignment(
	assignmentId: string
): Promise<{ data: { deleted: true } }> {
	return fetchApiJson<{ data: { deleted: true } }>(
		assignmentPath(assignmentId),
		{ method: "DELETE" }
	);
}
