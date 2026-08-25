import "./test-utils/route-test-env.js";

import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { createContextFromRequest } from "@brnit/api/context";
// biome-ignore lint/performance/noNamespaceImport: the mock must re-export every input schema the controller imports
import * as foodSchemas from "@brnit/api/food/schemas";
import { HttpError } from "@brnit/api/http-error";
import {
	paginationQueryInput,
	queryParam,
} from "@brnit/api/pagination/query-params";
import express from "express";

import { installRouteAuthMiddlewareMock } from "./route-test-auth-mock.js";
import {
	apiRouteMocks,
	resetApiRouteMocks,
} from "./test-utils/route-api-mock-state.js";
import { startEphemeralServer } from "./test-utils/route-test-http.js";

/**
 * Route integration test for the food router: a real Express app on an
 * ephemeral port, driven with `fetch`.
 *
 * The guards and the `@brnit/api` handlers are doubles; **the schemas are the
 * real ones**, so this covers the query parsing and status mapping the
 * controller is responsible for — which is exactly what the pre-overhaul
 * Next.js route test covered.
 */

type HandlerDouble = (...args: unknown[]) => Promise<unknown>;

const EMPTY_PAGE = {
	data: [],
	pagination: { page: 1, perPage: 10, totalItems: 0, totalPages: 0 },
};

const handlers: Record<string, HandlerDouble> = {};

function resetHandlers(): void {
	for (const name of [
		"createFoodCategory",
		"createFoodItem",
		"deleteFoodCategory",
		"deleteFoodItem",
		"getFoodCategory",
		"getFoodItem",
		"getFoodItemAlternatives",
		"listAllFoodCategories",
		"listFoodCategories",
		"listFoodItems",
		"updateFoodCategory",
		"updateFoodItem",
	]) {
		handlers[name] = () => Promise.resolve(EMPTY_PAGE);
	}
}

resetHandlers();

/** Forwards to whatever double the current test installed. */
function delegate(name: string): HandlerDouble {
	return (...args: unknown[]) => {
		const handler = handlers[name];
		if (!handler) {
			throw new Error(`no handler double registered for ${name}`);
		}
		return handler(...args);
	};
}

installRouteAuthMiddlewareMock();

mock.module("@brnit/api", () => ({
	...foodSchemas,
	HttpError,
	createContextFromRequest,
	paginationQueryInput,
	queryParam,
	createFoodCategory: delegate("createFoodCategory"),
	createFoodItem: delegate("createFoodItem"),
	deleteFoodCategory: delegate("deleteFoodCategory"),
	deleteFoodItem: delegate("deleteFoodItem"),
	getFoodCategory: delegate("getFoodCategory"),
	getFoodItem: delegate("getFoodItem"),
	getFoodItemAlternatives: delegate("getFoodItemAlternatives"),
	listAllFoodCategories: delegate("listAllFoodCategories"),
	listFoodCategories: delegate("listFoodCategories"),
	listFoodItems: delegate("listFoodItems"),
	updateFoodCategory: delegate("updateFoodCategory"),
	updateFoodItem: delegate("updateFoodItem"),
}));

const { createFoodRouter } = await import("./food.routes.js");

const app = express();
app.use(express.json());
app.use("/api/v1", createFoodRouter());

const server = await startEphemeralServer(app);

afterAll(async () => {
	await server.close();
});

beforeEach(() => {
	resetApiRouteMocks();
	resetHandlers();
});

function signIn(role: string | null): void {
	apiRouteMocks.session = {
		session: { activeOrganizationId: null, id: "session-1" },
		user: { id: "user-1", role },
	};
}

async function get(path: string): Promise<{ body: unknown; status: number }> {
	const response = await fetch(`${server.baseUrl}${path}`);
	return { body: await response.json(), status: response.status };
}

const ALTERNATIVES_PATH = "/api/v1/member/me/food-items/ref-1/alternatives";

describe("GET /member/me/food-items/:foodItemId/alternatives", () => {
	it("answers 401 when there is no session", async () => {
		const { status } = await get(`${ALTERNATIVES_PATH}?quantity=150`);

		expect(status).toBe(401);
	});

	it("answers 400 when quantity is missing", async () => {
		signIn("user");

		const { body, status } = await get(ALTERNATIVES_PATH);

		expect(status).toBe(400);
		expect(body).toMatchObject({ error: "Invalid query parameters" });
	});

	it("answers 404 when the reference food item is gone", async () => {
		signIn("user");
		handlers.getFoodItemAlternatives = () =>
			Promise.reject(new HttpError(404, "Food item not found"));

		const { body, status } = await get(`${ALTERNATIVES_PATH}?quantity=150`);

		expect(status).toBe(404);
		expect(body).toEqual({ error: "Food item not found" });
	});

	it("answers 200 with the paginated match list", async () => {
		signIn("user");
		handlers.getFoodItemAlternatives = () =>
			Promise.resolve({
				data: [
					{
						calories: 250,
						carbs: 0,
						categories: [{ id: "cat-1", name: "Proteins" }],
						deltaCalories: 2,
						deltaCarbs: 0,
						deltaFat: 0.2,
						deltaProtein: 0.5,
						fat: 5,
						foodItemId: "alt-1",
						name: "Turkey",
						protein: 30,
						suggestedQuantity: 160,
						suggestedQuantityGrams: 160,
						unit: "100g",
					},
				],
				pagination: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 },
			});

		const { body, status } = await get(`${ALTERNATIVES_PATH}?quantity=150`);

		expect(status).toBe(200);
		expect(body).toMatchObject({
			pagination: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 },
		});
		expect((body as { data: { name: string }[] }).data[0]?.name).toBe("Turkey");
	});

	it("passes the parsed query through to the handler", async () => {
		signIn("user");
		let received: unknown;
		handlers.getFoodItemAlternatives = (_ctx: unknown, input: unknown) => {
			received = input;
			return Promise.resolve(EMPTY_PAGE);
		};

		await get(`${ALTERNATIVES_PATH}?quantity=150&page=2&perPage=5`);

		expect(received).toEqual({
			foodItemId: "ref-1",
			page: 2,
			perPage: 5,
			quantity: 150,
		});
	});
});

describe("admin food routes", () => {
	it("answers 401 for a signed-in non-admin", async () => {
		signIn("user");

		const { status } = await get("/api/v1/admin/food-categories");

		expect(status).toBe(401);
	});

	it("serves the list to an app admin", async () => {
		signIn("admin");

		const { status } = await get("/api/v1/admin/food-categories");

		expect(status).toBe(200);
	});

	it("surfaces a blocking-reference conflict as 409", async () => {
		signIn("admin");
		handlers.deleteFoodCategory = () =>
			Promise.reject(
				new HttpError(
					409,
					"Cannot delete this category while food items are assigned to it"
				)
			);

		const response = await fetch(
			`${server.baseUrl}/api/v1/admin/food-categories/cat-1`,
			{ method: "DELETE" }
		);

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			error: "Cannot delete this category while food items are assigned to it",
		});
	});
});

describe("nutritionist food routes", () => {
	it("answers 403 when the caller has no nutritionist access", async () => {
		signIn("user");

		const { status } = await get("/api/v1/nutritionist/food-items");

		expect(status).toBe(403);
	});

	it("serves the read-only list to a global nutritionist", async () => {
		signIn("nutritionist");

		const { status } = await get("/api/v1/nutritionist/food-items");

		expect(status).toBe(200);
	});
});

describe("member food categories", () => {
	it("returns the flat list for any signed-in member", async () => {
		signIn("user");
		handlers.listAllFoodCategories = () =>
			Promise.resolve({
				data: [{ description: null, id: "c1", name: "Fruit" }],
			});

		const { body, status } = await get("/api/v1/member/me/food-categories");

		expect(status).toBe(200);
		expect(body).toEqual({
			data: [{ description: null, id: "c1", name: "Fruit" }],
		});
	});
});
