import { describe, expect, it } from "bun:test";

import { canManageNutritionCatalog } from "./access";

describe("canManageNutritionCatalog", () => {
	it("allows an app admin with no organization", () => {
		expect(
			canManageNutritionCatalog({
				activeOrgId: null,
				appRole: "admin",
				isOrgNutritionist: false,
			})
		).toBe(true);
	});

	it("allows a global nutritionist with no organization", () => {
		expect(
			canManageNutritionCatalog({
				activeOrgId: null,
				appRole: "nutritionist",
				isOrgNutritionist: false,
			})
		).toBe(true);
	});

	it("allows an org nutritionist with an active organization", () => {
		expect(
			canManageNutritionCatalog({
				activeOrgId: "org_1",
				appRole: "user",
				isOrgNutritionist: true,
			})
		).toBe(true);
	});

	it("rejects an org nutritionist without an active organization", () => {
		expect(
			canManageNutritionCatalog({
				activeOrgId: null,
				appRole: "user",
				isOrgNutritionist: true,
			})
		).toBe(false);
	});

	it("rejects a plain user in an organization", () => {
		expect(
			canManageNutritionCatalog({
				activeOrgId: "org_1",
				appRole: "user",
				isOrgNutritionist: false,
			})
		).toBe(false);
	});

	it("rejects a coach and an unknown role", () => {
		expect(
			canManageNutritionCatalog({
				activeOrgId: "org_1",
				appRole: "coach",
				isOrgNutritionist: false,
			})
		).toBe(false);
		expect(
			canManageNutritionCatalog({
				activeOrgId: "org_1",
				appRole: "administrator",
				isOrgNutritionist: false,
			})
		).toBe(false);
	});

	it("rejects a missing role", () => {
		expect(
			canManageNutritionCatalog({
				activeOrgId: null,
				appRole: null,
				isOrgNutritionist: false,
			})
		).toBe(false);
	});
});
