import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
	dietPlanMealConsumptionItem,
	dietPlanMealItemOverride,
	foodCategory,
	foodItem,
	foodItemCategory,
	mealItem,
} from "@brnit/db/schema";

import type { Context, SessionUser } from "../context";
import { HttpError } from "../http-error";

/**
 * Handler-level tests for the food endpoints.
 *
 * `@brnit/db` is replaced with a fake whose query builders are thenable, which
 * is the only shape these handlers use: `select().from(table)` optionally
 * followed by `where()/limit()/orderBy()/offset()`, then awaited. The table
 * object decides which rows come back, so a test states its fixtures per table.
 *
 * `@brnit/env/server` is real — it is what supplies the alternatives tolerances
 * — so placeholder values are set before the module graph loads.
 */

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/brnit_test";
process.env.BETTER_AUTH_SECRET ??= "test-better-auth-secret-min-32-chars!!!!";
process.env.BETTER_AUTH_URL ??= "http://127.0.0.1:3000";
process.env.CORS_ORIGIN ??= "http://127.0.0.1:3000";

interface FoodItemRowFixture {
	calories: string;
	carbs: string;
	fat: string;
	gramsPerUnit: string | null;
	id: string;
	name: string;
	protein: string;
	unit: string;
}

const state: {
	deleted: Map<unknown, unknown[]>;
	findFirst: unknown;
	findMany: unknown[];
	inserted: Map<unknown, unknown[]>;
	rows: Map<unknown, unknown[]>;
} = {
	deleted: new Map(),
	findFirst: null,
	findMany: [],
	inserted: new Map(),
	rows: new Map(),
};

function resetState(): void {
	state.deleted = new Map();
	state.findFirst = null;
	state.findMany = [];
	state.inserted = new Map();
	state.rows = new Map();
}

interface Thenable {
	then: (
		onFulfilled?: (value: unknown[]) => unknown,
		onRejected?: (reason: unknown) => unknown
	) => Promise<unknown>;
}

/** Chainable, awaitable stand-in for a Drizzle select builder. */
function selectBuilder(): Thenable {
	let table: unknown;
	const builder: Record<string, unknown> = {
		then: (
			onFulfilled?: (value: unknown[]) => unknown,
			onRejected?: (reason: unknown) => unknown
		) =>
			Promise.resolve(state.rows.get(table) ?? []).then(
				onFulfilled,
				onRejected
			),
	};
	builder.from = (value: unknown) => {
		table = value;
		return builder;
	};
	for (const method of ["where", "limit", "offset", "orderBy", "groupBy"]) {
		builder[method] = () => builder;
	}
	return builder as unknown as Thenable;
}

function writeBuilder(table: unknown, sink: Map<unknown, unknown[]>): unknown {
	const builder: Record<string, unknown> = {
		returning: () => Promise.resolve(sink.get(table) ?? []),
		then: (
			onFulfilled?: (value: unknown[]) => unknown,
			onRejected?: (reason: unknown) => unknown
		) => Promise.resolve([]).then(onFulfilled, onRejected),
	};
	for (const method of ["values", "set", "where"]) {
		builder[method] = () => builder;
	}
	return builder;
}

const fakeDb = {
	delete: (table: unknown) => writeBuilder(table, state.deleted),
	insert: (table: unknown) => writeBuilder(table, state.inserted),
	query: {
		foodItem: {
			findFirst: () => Promise.resolve(state.findFirst),
			findMany: () => Promise.resolve(state.findMany),
		},
	},
	select: () => selectBuilder(),
	transaction: (callback: (tx: unknown) => Promise<unknown>) =>
		callback(fakeDb),
	update: (table: unknown) => writeBuilder(table, state.inserted),
};

mock.module("@brnit/db", () => ({ db: fakeDb }));

// Neutralizes Cloudinary: uploads and destroys are network I/O that no food
// test needs, and the credentials are not configured here.
mock.module("../food/image", () => ({
	resolveFoodItemImageUpdate: () => Promise.resolve(undefined),
	uploadFoodItemImage: () => Promise.resolve("food-items/uploaded"),
}));

const {
	createFoodCategory,
	deleteFoodCategory,
	deleteFoodItem,
	getFoodItemAlternatives,
	updateFoodItem,
} = await import("./food");

function contextFor(role: string | null): Context {
	return {
		headers: {},
		memberId: null,
		organization: null,
		organizationId: null,
		session: null,
		user: { id: "user-1", role } as unknown as SessionUser,
	};
}

const MEMBER_CONTEXT = contextFor("user");
const ADMIN_CONTEXT = contextFor("admin");
const ANONYMOUS_CONTEXT: Context = { ...MEMBER_CONTEXT, user: null };

async function expectHttpError(
	work: Promise<unknown>,
	status: number
): Promise<HttpError> {
	try {
		await work;
	} catch (err) {
		expect(err).toBeInstanceOf(HttpError);
		expect((err as HttpError).status).toBe(status);
		return err as HttpError;
	}
	throw new Error(`expected the handler to throw ${status}`);
}

const CHICKEN: FoodItemRowFixture = {
	calories: "165",
	carbs: "0",
	fat: "3.6",
	gramsPerUnit: null,
	id: "ref-1",
	name: "Chicken",
	protein: "31",
	unit: "100g",
};

function alternativesInput(foodItemId = "ref-1") {
	return { foodItemId, page: 1, perPage: 10, quantity: 150 };
}

beforeEach(() => {
	resetState();
});

describe("getFoodItemAlternatives", () => {
	it("rejects an anonymous caller", async () => {
		await expectHttpError(
			getFoodItemAlternatives(ANONYMOUS_CONTEXT, alternativesInput()),
			401
		);
	});

	it("answers 404 when the reference food item does not exist", async () => {
		state.rows.set(foodItemCategory, []);
		state.findFirst = null;

		const error = await expectHttpError(
			getFoodItemAlternatives(MEMBER_CONTEXT, alternativesInput("missing")),
			404
		);
		expect(error.message).toBe("Food item not found");
	});

	it("answers 400 when the reference has a null macro", async () => {
		state.rows.set(foodItemCategory, [{ foodCategoryId: "cat-1" }]);
		state.findFirst = { ...CHICKEN, calories: null };

		const error = await expectHttpError(
			getFoodItemAlternatives(MEMBER_CONTEXT, alternativesInput()),
			400
		);
		expect(error.message).toBe(
			"Reference food item has missing macros or categories"
		);
	});

	it("answers 400 when the reference has no categories", async () => {
		state.rows.set(foodItemCategory, []);
		state.findFirst = CHICKEN;

		await expectHttpError(
			getFoodItemAlternatives(MEMBER_CONTEXT, alternativesInput()),
			400
		);
	});

	it("returns an empty page when nothing shares a category", async () => {
		state.rows.set(foodItemCategory, [{ foodCategoryId: "cat-1" }]);
		state.findFirst = CHICKEN;
		state.findMany = [];

		const response = await getFoodItemAlternatives(
			MEMBER_CONTEXT,
			alternativesInput()
		);

		expect(response.data).toEqual([]);
		expect(response.pagination).toEqual({
			page: 1,
			perPage: 10,
			totalItems: 0,
			totalPages: 0,
		});
	});

	it("scores a candidate that shares a category with the reference", async () => {
		state.rows.set(foodItemCategory, [{ foodCategoryId: "cat-1" }]);
		state.findFirst = CHICKEN;
		state.findMany = [
			{
				calories: "170",
				carbs: "0",
				fat: "4",
				foodItemCategories: [{ category: { id: "cat-1", name: "Proteins" } }],
				gramsPerUnit: null,
				id: "turkey",
				name: "Turkey breast",
				protein: "32",
				unit: "100g",
			},
		];

		const response = await getFoodItemAlternatives(
			MEMBER_CONTEXT,
			alternativesInput()
		);

		expect(response.pagination.totalItems).toBe(1);
		expect(response.data[0]?.foodItemId).toBe("turkey");
		expect(response.data[0]?.suggestedQuantity).toBe(150);
		expect(response.data[0]?.categories).toEqual([
			{ id: "cat-1", name: "Proteins" },
		]);
	});
});

describe("food item blocking references", () => {
	it("refuses to edit a food item used by a meal", async () => {
		state.rows.set(foodItem, [{ imagePublicId: null }]);
		state.rows.set(mealItem, [{ id: "meal-item-1" }]);

		const error = await expectHttpError(
			updateFoodItem(ADMIN_CONTEXT, {
				clearImage: false,
				foodItemId: "food-1",
				name: "Renamed",
			}),
			409
		);
		expect(error.message).toContain("Cannot edit this food item");
	});

	it("refuses to edit a food item used by a diet plan override", async () => {
		state.rows.set(foodItem, [{ imagePublicId: null }]);
		state.rows.set(dietPlanMealItemOverride, [{ id: "override-1" }]);

		await expectHttpError(
			updateFoodItem(ADMIN_CONTEXT, {
				clearImage: false,
				foodItemId: "food-1",
				name: "Renamed",
			}),
			409
		);
	});

	it("refuses to delete a food item used by a consumption log", async () => {
		state.rows.set(foodItem, [{ id: "food-1" }]);
		state.rows.set(dietPlanMealConsumptionItem, [{ id: "consumed-1" }]);

		const error = await expectHttpError(
			deleteFoodItem(ADMIN_CONTEXT, { foodItemId: "food-1" }),
			409
		);
		expect(error.message).toContain("Cannot delete this food item");
	});

	it("answers 404 before 409 when the food item does not exist", async () => {
		state.rows.set(foodItem, []);
		state.rows.set(mealItem, [{ id: "meal-item-1" }]);

		await expectHttpError(
			deleteFoodItem(ADMIN_CONTEXT, { foodItemId: "missing" }),
			404
		);
	});

	it("rejects a non-admin caller", async () => {
		await expectHttpError(
			deleteFoodItem(MEMBER_CONTEXT, { foodItemId: "food-1" }),
			401
		);
	});
});

describe("deleteFoodCategory", () => {
	it("refuses to delete a category that still has food items", async () => {
		state.rows.set(foodCategory, [{ id: "cat-1" }]);
		state.rows.set(foodItemCategory, [{ foodItemId: "food-1" }]);

		const error = await expectHttpError(
			deleteFoodCategory(ADMIN_CONTEXT, { foodCategoryId: "cat-1" }),
			409
		);
		expect(error.message).toBe(
			"Cannot delete this category while food items are assigned to it"
		);
	});

	it("answers 404 when the category does not exist", async () => {
		state.rows.set(foodCategory, []);
		state.rows.set(foodItemCategory, []);

		await expectHttpError(
			deleteFoodCategory(ADMIN_CONTEXT, { foodCategoryId: "missing" }),
			404
		);
	});

	it("deletes an unreferenced category and echoes the removed row", async () => {
		const createdAt = new Date("2026-01-02T03:04:05.000Z");
		state.rows.set(foodCategory, [{ id: "cat-1" }]);
		state.rows.set(foodItemCategory, []);
		state.deleted.set(foodCategory, [
			{ createdAt, description: null, id: "cat-1", name: "Proteins" },
		]);

		const response = await deleteFoodCategory(ADMIN_CONTEXT, {
			foodCategoryId: "cat-1",
		});

		expect(response.data).toEqual({
			createdAt: createdAt.toISOString(),
			description: null,
			id: "cat-1",
			name: "Proteins",
		});
	});
});

describe("food category writes", () => {
	it("rejects a caller without the admin app role", async () => {
		await expectHttpError(
			createFoodCategory(MEMBER_CONTEXT, { name: "Proteins" }),
			401
		);
	});
});
