import type { SortOrder } from "@brnit/api";

/**
 * Every TanStack Query key in the app. One module, typed factory functions —
 * never a nested object literal.
 *
 * Rules (`docs/migration/frontend.md` -> Query keys):
 *  - element 0 is a kebab-case resource string, and it is the only place a
 *    literal string is hard-coded;
 *  - the return type is an explicit `readonly [...]` tuple, so a changed
 *    signature breaks every call site instead of silently splitting a cache;
 *  - **most-stable segments first** (scope, then id, then filters) so a prefix
 *    invalidation actually catches the rows it means to;
 *  - every paginated key has a `…Queries` prefix companion for invalidation,
 *    and list/detail live under *different* roots — fan-outs that need both go
 *    through a named invalidation helper (`lib/api/invalidate-*.ts`).
 */

/**
 * Which tree an endpoint is read through. The admin and nutritionist trees
 * serve the same rows behind different guards, so they must not share a cache
 * entry: a nutritionist demoted mid-session would otherwise keep reading the
 * admin page they no longer have access to.
 */
export type FoodCatalogScope = "admin" | "nutritionist";

export interface FoodItemsFilters {
	categoryId: string;
	page: number;
	perPage: number;
	q: string;
	sortBy: string;
	sortOrder: SortOrder;
}

export interface CatalogListFilters {
	page: number;
	perPage: number;
	q: string;
	sortBy: string;
	sortOrder: SortOrder;
}

// ---------------------------------------------------------------------------
// Food items
// ---------------------------------------------------------------------------

export function foodItemsQueryKey(
	scope: FoodCatalogScope,
	filters: FoodItemsFilters
): readonly [
	"food-items",
	FoodCatalogScope,
	string,
	string,
	string,
	SortOrder,
	number,
	number,
] {
	return [
		"food-items",
		scope,
		filters.categoryId,
		filters.q,
		filters.sortBy,
		filters.sortOrder,
		filters.page,
		filters.perPage,
	];
}

/** Prefix for invalidating every food-item list query. */
export function foodItemsQueries(): readonly ["food-items"] {
	return ["food-items"];
}

export function foodItemsQueriesForScope(
	scope: FoodCatalogScope
): readonly ["food-items", FoodCatalogScope] {
	return ["food-items", scope];
}

export function foodItemQueryKey(
	scope: FoodCatalogScope,
	foodItemId: string
): readonly ["food-item", FoodCatalogScope, string] {
	return ["food-item", scope, foodItemId];
}

/** Prefix for invalidating every food-item detail query. */
export function foodItemQueries(): readonly ["food-item"] {
	return ["food-item"];
}

// ---------------------------------------------------------------------------
// Food categories
// ---------------------------------------------------------------------------

export function foodCategoriesQueryKey(
	scope: FoodCatalogScope,
	filters: CatalogListFilters
): readonly [
	"food-categories",
	FoodCatalogScope,
	string,
	string,
	SortOrder,
	number,
	number,
] {
	return [
		"food-categories",
		scope,
		filters.q,
		filters.sortBy,
		filters.sortOrder,
		filters.page,
		filters.perPage,
	];
}

export function foodCategoriesQueries(): readonly ["food-categories"] {
	return ["food-categories"];
}

export function foodCategoryQueryKey(
	scope: FoodCatalogScope,
	foodCategoryId: string
): readonly ["food-category", FoodCatalogScope, string] {
	return ["food-category", scope, foodCategoryId];
}

export function foodCategoryQueries(): readonly ["food-category"] {
	return ["food-category"];
}

// ---------------------------------------------------------------------------
// Meals
// ---------------------------------------------------------------------------

export function mealsQueryKey(
	scope: FoodCatalogScope,
	filters: CatalogListFilters
): readonly [
	"meals",
	FoodCatalogScope,
	string,
	string,
	SortOrder,
	number,
	number,
] {
	return [
		"meals",
		scope,
		filters.q,
		filters.sortBy,
		filters.sortOrder,
		filters.page,
		filters.perPage,
	];
}

export function mealsQueries(): readonly ["meals"] {
	return ["meals"];
}

export function mealQueryKey(
	scope: FoodCatalogScope,
	mealId: string
): readonly ["meal", FoodCatalogScope, string] {
	return ["meal", scope, mealId];
}

export function mealQueries(): readonly ["meal"] {
	return ["meal"];
}

// ---------------------------------------------------------------------------
// Diet plans
// ---------------------------------------------------------------------------

export function dietPlansQueryKey(
	scope: FoodCatalogScope,
	filters: CatalogListFilters
): readonly [
	"diet-plans",
	FoodCatalogScope,
	string,
	string,
	SortOrder,
	number,
	number,
] {
	return [
		"diet-plans",
		scope,
		filters.q,
		filters.sortBy,
		filters.sortOrder,
		filters.page,
		filters.perPage,
	];
}

export function dietPlansQueries(): readonly ["diet-plans"] {
	return ["diet-plans"];
}

export function dietPlanQueryKey(
	scope: FoodCatalogScope,
	dietPlanId: string
): readonly ["diet-plan", FoodCatalogScope, string] {
	return ["diet-plan", scope, dietPlanId];
}

export function dietPlanQueries(): readonly ["diet-plan"] {
	return ["diet-plan"];
}

// ---------------------------------------------------------------------------
// Diet plan assignments (nutritionist)
// ---------------------------------------------------------------------------

export function dietPlanAssignmentsQueryKey(
	organizationId: string,
	filters: { memberId?: string; page: number; perPage: number }
): readonly ["diet-plan-assignments", string, string, number, number] {
	// `memberId` is part of the key because the endpoint accepts it as a
	// filter: without it two members' lists collide on one cache entry. The
	// empty string stands for "the whole organization", so an unfiltered list
	// and a per-member list stay distinct.
	return [
		"diet-plan-assignments",
		organizationId,
		filters.memberId ?? "",
		filters.page,
		filters.perPage,
	];
}

export function dietPlanAssignmentsQueriesForOrganization(
	organizationId: string
): readonly ["diet-plan-assignments", string] {
	return ["diet-plan-assignments", organizationId];
}

export function dietPlanAssignmentsQueries(): readonly [
	"diet-plan-assignments",
] {
	return ["diet-plan-assignments"];
}

export function dietPlanAssignmentQueryKey(
	assignmentId: string
): readonly ["diet-plan-assignment", string] {
	return ["diet-plan-assignment", assignmentId];
}

export function dietPlanAssignmentQueries(): readonly ["diet-plan-assignment"] {
	return ["diet-plan-assignment"];
}

// ---------------------------------------------------------------------------
// Body composition assessments
// ---------------------------------------------------------------------------

/** `direct-admin` writes; `nutritionist` reads the same rows through its own guard. */
export type AssessmentScope = "direct-admin" | "nutritionist";

export function bodyCompositionAssessmentsQueryKey(
	scope: AssessmentScope,
	organizationId: string,
	filters: { memberId: string; page: number; perPage: number }
): readonly [
	"body-composition-assessments",
	AssessmentScope,
	string,
	string,
	number,
	number,
] {
	return [
		"body-composition-assessments",
		scope,
		organizationId,
		filters.memberId,
		filters.page,
		filters.perPage,
	];
}

export function bodyCompositionAssessmentsQueries(): readonly [
	"body-composition-assessments",
] {
	return ["body-composition-assessments"];
}

export function bodyCompositionAssessmentQueryKey(
	assessmentId: string
): readonly ["body-composition-assessment", string] {
	return ["body-composition-assessment", assessmentId];
}

export function bodyCompositionAssessmentQueries(): readonly [
	"body-composition-assessment",
] {
	return ["body-composition-assessment"];
}

// ---------------------------------------------------------------------------
// Identity and organizations
// ---------------------------------------------------------------------------

/**
 * Not a factory: the resolved organization scope is per-session, so there is
 * exactly one entry and no parameters to key it on.
 */
export function organizationContextQueryKey(): readonly [
	"organization-context",
] {
	return ["organization-context"];
}

export function profileQueryKey(): readonly ["profile"] {
	return ["profile"];
}

export function adminUsersQueryKey(filters: {
	page: number;
	perPage: number;
	q: string;
	role: string;
	sortBy: string;
	sortOrder: string;
}): readonly ["admin-users", string, string, string, string, number, number] {
	// Every segment that changes which rows come back must be in the key. Role
	// and sort were missing, so two different role filters shared one cache
	// entry and showed each other's rows. Most-stable first, so the
	// `adminUsersQueries()` prefix still invalidates the whole set.
	return [
		"admin-users",
		filters.role,
		filters.sortBy,
		filters.sortOrder,
		filters.q,
		filters.page,
		filters.perPage,
	];
}

export function adminUsersQueries(): readonly ["admin-users"] {
	return ["admin-users"];
}

export function organizationsQueryKey(): readonly ["organizations"] {
	return ["organizations"];
}

export function organizationQueryKey(
	organizationId: string
): readonly ["organization", string] {
	return ["organization", organizationId];
}

export function organizationMembersQueryKey(
	organizationId: string
): readonly ["organization-members", string] {
	return ["organization-members", organizationId];
}

export function organizationMembersQueries(): readonly [
	"organization-members",
] {
	return ["organization-members"];
}
