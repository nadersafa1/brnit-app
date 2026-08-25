import type { FoodItemAlternativesInput, ListFoodItemsInput } from "@brnit/api";

/**
 * Query-parameter shapes for the member food endpoints.
 *
 * Derived from the server's own Zod input types rather than restated, so a
 * renamed sort key or a dropped filter fails compilation here instead of
 * silently sending a parameter the API ignores. Only the *request* side lives
 * in this app — every response type comes straight from `@brnit/api`.
 */

/** `sortBy` values `GET /member/me/food-items` accepts. */
export type FoodItemSortBy = NonNullable<ListFoodItemsInput["sortBy"]>;

/** Shared by every list endpoint. */
export type FoodItemSortOrder = ListFoodItemsInput["sortOrder"];

/**
 * The subset of `ListFoodItemsInput` the app actually sets. `page` and
 * `perPage` are optional here because the server defaults them; the schema's
 * parsed type has them resolved to numbers.
 */
export interface FoodItemsQuery {
	categoryId?: string;
	page?: number;
	perPage?: number;
	q?: string;
	sortBy?: FoodItemSortBy;
	sortOrder?: FoodItemSortOrder;
}

/** `GET /member/me/food-items/:foodItemId/alternatives`. */
export interface FoodItemAlternativesQuery {
	page?: number;
	perPage?: number;
	quantity: FoodItemAlternativesInput["quantity"];
}
