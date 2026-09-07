import { describe, expect, it } from "bun:test";

import {
	createAssessmentFormSchema,
	updateAssessmentFormSchema,
} from "@/hooks/use-assessment-form";
import {
	buildCreateAssessmentFormData,
	buildUpdateAssessmentFormData,
} from "@/lib/api/queries/assessments";

/**
 * The blank-field contract, from the control through to the multipart body.
 *
 * A blank numeric field used to arrive at the API as `""`, coerce to `0` and be
 * stored as a real measurement. Both halves of the fix are asserted here: the
 * schemas refuse to produce a zero, and the request builders refuse to send an
 * empty string.
 */

const FILLED_FORM = {
	assessedAt: "2026-04-08T21:30",
	bmi: "22.5",
	bodyFatPercent: "18",
	bodyWaterL: "40",
	heightCm: "180",
	muscleMassKg: "60",
	visceralFatAreaCm2: "70",
	weightKg: "75",
};

describe("createAssessmentFormSchema", () => {
	it("parses a complete form into numbers and an ISO instant", () => {
		const parsed = createAssessmentFormSchema.parse(FILLED_FORM);
		expect(parsed.bmi).toBe(22.5);
		expect(parsed.weightKg).toBe(75);
		expect(parsed.assessedAt).toBe(new Date(2026, 3, 8, 21, 30).toISOString());
	});

	it("rejects a blank metric instead of reading it as zero", () => {
		const result = createAssessmentFormSchema.safeParse({
			...FILLED_FORM,
			weightKg: "",
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual(["weightKg"]);
	});

	it("rejects a metric above the range the server enforces", () => {
		const result = createAssessmentFormSchema.safeParse({
			...FILLED_FORM,
			bmi: "100",
		});
		expect(result.success).toBe(false);
	});

	it("accepts the top of the range", () => {
		expect(
			createAssessmentFormSchema.safeParse({ ...FILLED_FORM, bmi: "99.99" })
				.success
		).toBe(true);
	});

	it("requires a date", () => {
		const result = createAssessmentFormSchema.safeParse({
			...FILLED_FORM,
			assessedAt: "",
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual(["assessedAt"]);
	});
});

describe("updateAssessmentFormSchema", () => {
	it("reads a blank metric as absent, never as zero", () => {
		const parsed = updateAssessmentFormSchema.parse({
			...FILLED_FORM,
			weightKg: "",
		});
		expect(parsed.weightKg).toBeUndefined();
		expect(parsed.bmi).toBe(22.5);
	});

	it("reads a blank date as absent", () => {
		const parsed = updateAssessmentFormSchema.parse({
			...FILLED_FORM,
			assessedAt: "",
		});
		expect(parsed.assessedAt).toBeUndefined();
	});

	it("still enforces the range on the values that are present", () => {
		expect(
			updateAssessmentFormSchema.safeParse({
				...FILLED_FORM,
				bodyFatPercent: "101",
			}).success
		).toBe(false);
	});
});

describe("buildCreateAssessmentFormData", () => {
	it("sends every metric and the member it belongs to", () => {
		const body = buildCreateAssessmentFormData({
			assessedAt: "2026-04-08T21:30:00.000Z",
			bmi: 22.5,
			bodyFatPercent: 18,
			bodyWaterL: 40,
			heightCm: 180,
			memberId: "member-1",
			muscleMassKg: 60,
			visceralFatAreaCm2: 70,
			weightKg: 75,
		});
		expect(body.get("memberId")).toBe("member-1");
		expect(body.get("assessedAt")).toBe("2026-04-08T21:30:00.000Z");
		expect(body.get("weightKg")).toBe("75");
		expect(body.get("clearImage")).toBeNull();
	});
});

describe("buildUpdateAssessmentFormData", () => {
	it("omits absent metrics rather than sending an empty string", () => {
		const body = buildUpdateAssessmentFormData({
			bmi: 22.5,
			weightKg: undefined,
		});
		expect(body.get("bmi")).toBe("22.5");
		expect(body.get("weightKg")).toBeNull();
		expect(body.get("assessedAt")).toBeNull();
	});

	it("sends a zero the user actually typed", () => {
		const body = buildUpdateAssessmentFormData({ visceralFatAreaCm2: 0 });
		expect(body.get("visceralFatAreaCm2")).toBe("0");
	});

	it("clears the image only when no replacement was picked", () => {
		expect(
			buildUpdateAssessmentFormData({}, { clearImage: true }).get("clearImage")
		).toBe("true");

		const replaced = buildUpdateAssessmentFormData(
			{},
			{ clearImage: true, file: new File(["x"], "scan.png") }
		);
		expect(replaced.get("clearImage")).toBeNull();
		expect(replaced.get("file")).not.toBeNull();
	});
});
