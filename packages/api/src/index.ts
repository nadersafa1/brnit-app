/**
 * `@brnit/api` — the single source of truth for the HTTP contract.
 *
 * Server controllers import handlers from here. The web and native apps import
 * **types only** through this barrel; when they need a runtime value they take
 * it from the narrower subpath (`@brnit/api/pagination/offset`,
 * `@brnit/api/food/schemas`, …) so a client bundle never pulls in Drizzle.
 *
 * `src/db/*` is deliberately absent: it imports `drizzle-orm` and is reachable
 * by subpath only.
 *
 * Generated from the module exports and kept sorted by module path. This barrel
 * is intentional — `noBarrelFile` is disabled for it in `biome.json`.
 */

export type {
	AssessmentDto,
	AssessmentOrganizationDto,
	MemberAssessmentDto,
	MemberRecentAssessmentsDto,
} from "./assessment/dto";
export {
	assessmentImageUrl,
	assessmentToDto,
	assessmentToMemberDto,
} from "./assessment/dto";
export type {
	AssessmentInsertValues,
	AssessmentRow,
	AssessmentUpdateValues,
	MemberOrganizationLink,
} from "./assessment/queries";
export {
	assessmentBelongsToOrganization,
	deleteAssessment,
	findAssessmentById,
	findAssessmentForMember,
	findMemberOrganizationId,
	insertAssessment,
	listAssessmentsForOrganization,
	listMembershipsWithOrganization,
	listRecentAssessmentsForMembers,
	updateAssessment,
} from "./assessment/queries";
export type {
	AssessmentParams,
	CreateAssessmentInput,
	ListAssessmentsInput,
	MemberAssessmentInput,
	MemberRecentAssessmentsInput,
	UpdateAssessmentInput,
} from "./assessment/schemas";
export {
	assessmentParamsSchema,
	createAssessmentInputSchema,
	listAssessmentsInputSchema,
	memberAssessmentInputSchema,
	memberRecentAssessmentsInputSchema,
	updateAssessmentInputSchema,
} from "./assessment/schemas";
export type { OwnedAssignment } from "./assignment/access";
export {
	listAssignmentIdsForUser,
	listMemberIdSetForUser,
	requireAssignmentForUser,
} from "./assignment/access";
export type { AssignableMember } from "./assignment/authorization";
export {
	databaseOrganizationScope,
	listAssignmentIdsForOrganization,
	listOrganizationMemberIds,
	requireAssignableMember,
	requireNutritionistOrganizationId,
	requireNutritionistScope,
	requireSessionUser,
} from "./assignment/authorization";
export type {
	DeletedFlagDto,
	DietPlanAssignmentDto,
	DietPlanAssignmentWithMealTimesDto,
	MealItemOverrideDto,
	MealTimeOverrideDto,
	MemberDietPlanAssignmentDto,
} from "./assignment/dto";
export {
	dietPlanAssignmentToDto,
	dietPlanAssignmentWithMealTimesToDto,
	mealItemOverrideToDto,
	memberDietPlanAssignmentToDto,
} from "./assignment/dto";
export type {
	DisplayedMealItem,
	MealItemOverrideRecord,
	MealItemOverrideResolutionRow,
	MealItemOverrideSlot,
	UpsertMealItemOverrideOutcome,
	UpsertMealItemOverrideParams,
} from "./assignment/meal-item-overrides";
export {
	deleteMealItemOverrideDate,
	deleteMealItemOverrideSlot,
	listMealItemOverrideRows,
	requireOverrideSlot,
	resolveDisplayedMealItemForDate,
	upsertMealItemOverrideRow,
} from "./assignment/meal-item-overrides";
export {
	listFutureMealTimeOverrides,
	listFutureMealTimeOverridesForAssignments,
	saveAssignmentMealTimeOverrides,
} from "./assignment/meal-time-overrides";
export { databaseAssigneePool } from "./assignment/overlap";
export type {
	DatedOverrideRow,
	OverrideDateRemovalPlan,
	OverrideScopeInput,
	OverrideScopeWindow,
	OverrideWritePlan,
	OverrideWritePlanInput,
} from "./assignment/override-dates";
export {
	buildEffectiveDatesForScope,
	dedupeAndSortDateStrings,
	findOverrideRowCoveringDate,
	mergeEffectiveDates,
	normalizeOverrideScopeWindow,
	parseEffectiveDates,
	planOverrideDateRemoval,
	planOverrideWrite,
	removeDateFromEffectiveDates,
} from "./assignment/override-dates";
export type {
	AssigneePoolLoader,
	AssignmentAssignee,
	AssignmentDateRange,
	DateRange,
	NutritionistScope,
	OrganizationScopeProbe,
} from "./assignment/rules";
export {
	assertAssignmentVisibleToScope,
	assertNoOverlappingAssignment,
	assignmentBelongsToUser,
	dateRangesOverlap,
	findOverlappingAssignment,
} from "./assignment/rules";
export type {
	CreateDietPlanAssignmentInput,
	CreateDietPlanAssignmentNutritionistInput,
	DeleteMealItemOverrideInput,
	DietPlanAssignmentIdParams,
	DietPlanAssignmentListQuery,
	ListMealItemAlternativesInput,
	MealItemAlternativesQuery,
	MealItemOverrideParams,
	MealItemOverrideScope,
	MealTimeOverrideInput,
	SetMealItemOverrideBody,
	SetMealItemOverrideInput,
	UpdateDietPlanAssignmentBody,
	UpdateDietPlanAssignmentInput,
} from "./assignment/schemas";
export {
	createDietPlanAssignmentNutritionistInputSchema,
	dietPlanAssignmentIdParamsSchema,
	dietPlanAssignmentListQuerySchema,
	mealItemAlternativesQuerySchema,
	mealItemOverrideDateQuerySchema,
	mealItemOverrideParamsSchema,
	mealItemOverrideScopeSchema,
	mealTimeOverrideInputSchema,
	setMealItemOverrideBodySchema,
	updateDietPlanAssignmentBodySchema,
} from "./assignment/schemas";
export {
	deleteCloudinaryImage,
	uploadFileToCloudinary,
} from "./cloudinary/assets";
export {
	ensureCloudinaryConfigured,
	requireCloudinaryCloudName,
} from "./cloudinary/configure";
export {
	CLOUDINARY_ASSESSMENT_FOLDER,
	CLOUDINARY_FOOD_ITEM_FOLDER,
	CLOUDINARY_PROFILE_FOLDER,
} from "./cloudinary/folders";
export {
	buildCloudinaryUrl,
	extractPublicId,
	isCloudinaryUrl,
} from "./cloudinary/url";
export type {
	ConsumedItemDto,
	DietPlanMealConsumptionDto,
	DietPlanMealConsumptionListItemDto,
} from "./consumption/dto";
export {
	dietPlanMealConsumptionToDto,
	dietPlanMealConsumptionToListItemDto,
} from "./consumption/dto";
export type { AssignmentWindowSource } from "./consumption/guards";
export {
	assertNoMissingFoodItems,
	assertNotAlreadyLogged,
	assertWithinAssignmentWindow,
	assertWithinBackdateWindow,
} from "./consumption/guards";
export type { PlannedConsumptionItem } from "./consumption/planned-items";
export { resolvePlannedItemsForSlot } from "./consumption/planned-items";
export type {
	ConsumedItemInput,
	CreateDietPlanMealConsumptionInput,
	DeleteDietPlanMealConsumptionBySlotInput,
	DietPlanMealConsumptionIdParams,
	DietPlanMealConsumptionListQuery,
} from "./consumption/schemas";
export {
	createDietPlanMealConsumptionInputSchema,
	deleteDietPlanMealConsumptionBySlotInputSchema,
	dietPlanMealConsumptionIdParamsSchema,
	dietPlanMealConsumptionListQuerySchema,
} from "./consumption/schemas";
export type { DateWindow } from "./consumption/window";
export {
	assignmentConsumptionWindow,
	consumptionBackdateWindow,
	isWithinDateWindow,
} from "./consumption/window";
export type {
	Context,
	CreateContextInput,
	RequestAuthForContext,
	SessionRecord,
	SessionUser,
} from "./context";
export {
	createContextFromRequest,
	requireContextUser,
} from "./context";
export { assertCanManageDietPlans } from "./diet-plan/access";
export {
	assertDietPlanDeletable,
	assertDietPlanEditable,
	assertNoDietPlanMealRemoveUpdateOverlap,
	assertScheduledMealIdsExist,
	assertSlotIdsBelongToPlan,
	DIET_PLAN_ASSIGNED_DELETE_MESSAGE,
	DIET_PLAN_ASSIGNED_EDIT_MESSAGE,
} from "./diet-plan/conflicts";
export type {
	DietPlanDetailDto,
	DietPlanDto,
	DietPlanListItemDto,
	DietPlanMealDto,
	DietPlanMealItemDto,
	DietPlanMealItemRow,
	DietPlanRow,
	DietPlanSlotRow,
} from "./diet-plan/dto";
export {
	dietPlanMealItemToDto,
	dietPlanToDetailDto,
	dietPlanToDto,
	dietPlanToListItemDto,
	groupDietPlanMealItemsByMealId,
} from "./diet-plan/dto";
export type {
	CreateDietPlanInput,
	DeleteDietPlanInput,
	DietPlanMealInput,
	DietPlanParams,
	GetDietPlanInput,
	ListDietPlansInput,
	UpdateDietPlanInput,
	UpdateDietPlanMealInput,
} from "./diet-plan/schemas";
export {
	createDietPlanInputSchema,
	dayNumberSchema,
	dietPlanMealInputSchema,
	dietPlanParamsSchema,
	listDietPlansInputSchema,
	timeOfDaySchema,
	updateDietPlanBodySchema,
	updateDietPlanInputSchema,
} from "./diet-plan/schemas";
export type {
	AlternativeCandidateRow,
	AlternativesTolerancePct,
	MacroTotals,
	PerUnitMacros,
} from "./food/alternatives";
export {
	buildFoodItemAlternatives,
	buildMacroTolerance,
	DEFAULT_ALTERNATIVES_PER_PAGE,
	MAX_ALTERNATIVES_PER_PAGE,
	paginateAlternatives,
	referenceMacroTotals,
	suggestedQuantityInUnit,
	toMacroNumber,
} from "./food/alternatives";
export type {
	DeletedFoodItemDto,
	DeletedFoodItemResponse,
	DeletedFoodItemRow,
	FoodCategoryDto,
	FoodCategoryListResponse,
	FoodCategoryResponse,
	FoodCategoryRow,
	FoodCategorySummaryDto,
	FoodCategorySummaryListResponse,
	FoodCategorySummaryRow,
	FoodItemAlternativeDto,
	FoodItemAlternativesResponse,
	FoodItemCategoryDto,
	FoodItemCategoryJoinRow,
	FoodItemDto,
	FoodItemListResponse,
	FoodItemResponse,
	FoodItemRow,
} from "./food/dto";
export {
	deletedFoodItemToDto,
	foodCategoryToDto,
	foodCategoryToSummaryDto,
	foodItemCategoriesToDto,
	foodItemToDto,
} from "./food/dto";
export type { FoodItemImageUpdate } from "./food/image";
export {
	resolveFoodItemImageUpdate,
	uploadFoodItemImage,
} from "./food/image";
export type {
	CreateFoodCategoryInput,
	CreateFoodItemFields,
	CreateFoodItemInput,
	FoodCategoryParams,
	FoodItemAlternativesInput,
	FoodItemImageInput,
	FoodItemParams,
	ListFoodCategoriesInput,
	ListFoodItemsInput,
	UpdateFoodCategoryByIdInput,
	UpdateFoodCategoryInput,
	UpdateFoodItemByIdFields,
	UpdateFoodItemFields,
	UpdateFoodItemInput,
} from "./food/schemas";
export {
	createFoodCategoryInputSchema,
	createFoodItemInputSchema,
	foodCategoryParamsSchema,
	foodCategorySortBySchema,
	foodItemAlternativesInputSchema,
	foodItemParamsSchema,
	foodItemSortBySchema,
	foodUnitSchema,
	listFoodCategoriesInputSchema,
	listFoodItemsInputSchema,
	updateFoodCategoryByIdInputSchema,
	updateFoodCategoryInputSchema,
	updateFoodItemByIdInputSchema,
	updateFoodItemInputSchema,
} from "./food/schemas";
export type {
	CreateAssessmentHandlerInput,
	UpdateAssessmentHandlerInput,
} from "./handlers/assessment";
export {
	createBodyCompositionAssessment,
	deleteBodyCompositionAssessment,
	getBodyCompositionAssessment,
	getMemberAssessment,
	listBodyCompositionAssessments,
	listMemberRecentAssessments,
	updateBodyCompositionAssessment,
} from "./handlers/assessment";
export {
	createNutritionistDietPlanAssignment,
	deleteMemberMealItemOverride,
	deleteNutritionistDietPlanAssignment,
	getNutritionistDietPlanAssignment,
	listMemberDietPlanAssignments,
	listMemberMealItemAlternatives,
	listNutritionistDietPlanAssignments,
	setMemberMealItemOverride,
	updateNutritionistDietPlanAssignment,
} from "./handlers/assignment";
export {
	createMemberDietPlanMealConsumption,
	createNutritionistDietPlanMealConsumption,
	deleteMemberDietPlanMealConsumptionBySlot,
	deleteNutritionistDietPlanMealConsumption,
	listMemberDietPlanMealConsumptions,
	listNutritionistDietPlanMealConsumptions,
} from "./handlers/consumption";
export {
	createDietPlan,
	deleteDietPlan,
	getDietPlan,
	listDietPlans,
	updateDietPlan,
} from "./handlers/diet-plan";
export {
	createFoodCategory,
	createFoodItem,
	deleteFoodCategory,
	deleteFoodItem,
	foodCategoryHasBlockingReferences,
	foodItemHasBlockingReferences,
	getFoodCategory,
	getFoodItem,
	getFoodItemAlternatives,
	listAllFoodCategories,
	listFoodCategories,
	listFoodItems,
	updateFoodCategory,
	updateFoodItem,
} from "./handlers/food";
export {
	cloneMeal,
	createMeal,
	deleteMeal,
	getMeal,
	listMeals,
	updateMeal,
} from "./handlers/meal";
export {
	getConsumptionStreak,
	getCurrentDietPlan,
	getOrganizationLeaderboard,
} from "./handlers/member";
export type { UpdateProfileHandlerInput } from "./handlers/profile";
export {
	getProfile,
	updateProfile,
} from "./handlers/profile";
export type { ApiErrorBody } from "./http-error";
export { HttpError } from "./http-error";
export type { NutritionCatalogActor } from "./meal/access";
export {
	assertCanManageMeals,
	canManageNutritionCatalog,
	nutritionCatalogActorFromContext,
} from "./meal/access";
export {
	buildClonedMealName,
	MEAL_CLONE_NAME_SUFFIX,
	MEAL_NAME_MAX_LENGTH,
} from "./meal/clone-name";
export {
	assertMealFoodItemIdsExist,
	assertMealHasNoLineItems,
	assertMealItemIdsBelongToMeal,
	assertMealNotInAssignedPlan,
	assertMealNotUsedInDietPlan,
	assertNoMealItemRemoveUpdateOverlap,
	MEAL_HAS_ITEMS_MESSAGE,
	MEAL_IN_ASSIGNED_PLAN_MESSAGE,
	MEAL_USED_IN_PLAN_MESSAGE,
} from "./meal/conflicts";
export type {
	FoodCategoryRefDto,
	MealDetailDto,
	MealDto,
	MealItemDto,
	MealItemRow,
	MealRow,
} from "./meal/dto";
export {
	mealItemToDto,
	mealToDetailDto,
	mealToDto,
} from "./meal/dto";
export {
	findMissingIds,
	findRemoveUpdateConflicts,
	uniqueIds,
} from "./meal/mutation-ids";
export { recomputeMealTotals } from "./meal/recompute-totals";
export type {
	CloneMealInput,
	CreateMealInput,
	DeleteMealInput,
	GetMealInput,
	ListMealsInput,
	MealItemInput,
	MealParams,
	UpdateMealInput,
} from "./meal/schemas";
export {
	createMealInputSchema,
	listMealsInputSchema,
	mealItemInputSchema,
	mealParamsSchema,
	updateMealBodySchema,
	updateMealInputSchema,
} from "./meal/schemas";
export {
	calculateConsumptionStreak,
	loadConsumptionStreak,
} from "./member/consumption-streak";
export type {
	BuildCurrentDietPlanDaysInput,
	FoodDetails,
	OverrideSlotRow,
	PlanSlot,
	PlanSlotItem,
} from "./member/current-diet-plan";
export {
	buildCurrentDietPlanDays,
	loadCurrentDietPlan,
	resolveWindowDates,
} from "./member/current-diet-plan";
export type {
	ConsumptionStreakDto,
	CurrentDietPlanAssignmentDto,
	CurrentDietPlanDayDto,
	CurrentDietPlanDto,
	CurrentDietPlanMealDto,
	CurrentDietPlanMealItemDto,
	CurrentDietPlanPayloadDto,
	LeaderboardEntryDto,
	LeaderboardSelfDto,
	OrganizationLeaderboardDto,
} from "./member/dto";
export { LEADERBOARD_METRIC } from "./member/dto";
export type {
	FoodNutrition,
	MacrosDto,
} from "./member/macros";
export {
	macrosForQuantity,
	sumMacros,
	ZERO_MACROS,
} from "./member/macros";
export type { MemberOrganizationScope } from "./member/member-access";
export {
	assignmentAssigneeCondition,
	getUserMemberIds,
	NO_ORGANIZATION_ERROR_CODE,
	NOT_MEMBER_ERROR_CODE,
	requireMemberOrganization,
} from "./member/member-access";
export type { LeaderboardCandidate } from "./member/organization-leaderboard";
export {
	buildLeaderboardCandidates,
	buildLeaderboardSelf,
	compareLeaderboardCandidates,
	loadOrganizationLeaderboard,
	rankLeaderboardCandidates,
} from "./member/organization-leaderboard";
export type {
	CurrentDietPlanInput,
	OrganizationLeaderboardInput,
} from "./member/schemas";
export {
	currentDietPlanQuerySchema,
	organizationLeaderboardQuerySchema,
} from "./member/schemas";
export type {
	OrganizationContextDto,
	OrganizationSummary,
} from "./organization/context";
export {
	ANONYMOUS_ORGANIZATION_CONTEXT,
	organizationRoleFlags,
} from "./organization/context";
export type {
	PaginatedResponse,
	PaginationMeta,
} from "./pagination/offset";
export {
	calculateOffset,
	createPaginatedResponse,
	DEFAULT_PER_PAGE,
	MAX_PER_PAGE,
	PAGE_SIZE_OPTIONS,
} from "./pagination/offset";
export type {
	PaginationQuery,
	SortOrder,
	SortQuery,
	TextSearchQuery,
} from "./pagination/query-params";
export {
	pageSchema,
	paginationQueryInput,
	paginationQuerySchema,
	perPageSchema,
	queryParam,
	sortOrderSchema,
	sortQuerySchema,
	textSearchQuerySchema,
	textSearchSchema,
} from "./pagination/query-params";
export type {
	ProfileDto,
	ProfileSource,
} from "./profile/dto";
export {
	dobToDateString,
	profileToDto,
} from "./profile/dto";
export type { UpdateProfileInput } from "./profile/schemas";
export { updateProfileInputSchema } from "./profile/schemas";
