import { createAssessmentInputSchema } from "@brnit/api/assessment/schemas";
import { z } from "zod";

/**
 * The seven metric fields and the ranges the API enforces.
 *
 * The bounds are **read out of the server's own schema** rather than retyped:
 * `createAssessmentInputSchema` pipes each metric into a bounded
 * `z.number().min(…).max(…)`, and `z.toJSONSchema` reports those numbers
 * verbatim. That is what keeps the `min`/`max` on the controls, the messages the
 * form resolver produces, and the 400 the API would answer with from ever
 * disagreeing.
 *
 * A missing bound throws at module load: it can only mean the server schema
 * changed shape, and failing at import is far cheaper to diagnose than a form
 * that has quietly stopped clamping.
 */

const ASSESSMENT_JSON_SCHEMA = z.toJSONSchema(createAssessmentInputSchema, {
	io: "output",
});

/** Two decimals — every metric column is `numeric(_, 2)`. */
export const METRIC_STEP = "0.01";

export type AssessmentMetricName =
	| "bmi"
	| "bodyFatPercent"
	| "bodyWaterL"
	| "heightCm"
	| "muscleMassKg"
	| "visceralFatAreaCm2"
	| "weightKg";

export interface AssessmentMetricBounds {
	max: number;
	min: number;
}

const METRIC_NAMES = [
	"bmi",
	"bodyFatPercent",
	"bodyWaterL",
	"heightCm",
	"muscleMassKg",
	"visceralFatAreaCm2",
	"weightKg",
] as const satisfies readonly AssessmentMetricName[];

function metricBounds(name: AssessmentMetricName): AssessmentMetricBounds {
	const property = ASSESSMENT_JSON_SCHEMA.properties?.[name];
	const min = typeof property === "object" ? property.minimum : undefined;
	const max = typeof property === "object" ? property.maximum : undefined;
	if (typeof min !== "number" || typeof max !== "number") {
		throw new Error(
			`The assessment schema no longer publishes bounds for "${name}".`
		);
	}
	return { max, min };
}

export const ASSESSMENT_METRIC_BOUNDS: Record<
	AssessmentMetricName,
	AssessmentMetricBounds
> = Object.fromEntries(
	METRIC_NAMES.map((name) => [name, metricBounds(name)])
) as Record<AssessmentMetricName, AssessmentMetricBounds>;

export interface AssessmentMetricField extends AssessmentMetricBounds {
	label: string;
	name: AssessmentMetricName;
}

function metricField(
	name: AssessmentMetricName,
	label: string
): AssessmentMetricField {
	return { label, name, ...ASSESSMENT_METRIC_BOUNDS[name] };
}

/** Form order: the pairs an InBody printout puts side by side. */
export const ASSESSMENT_METRIC_FIELDS = [
	metricField("heightCm", "Height (cm)"),
	metricField("weightKg", "Weight (kg)"),
	metricField("bmi", "BMI"),
	metricField("bodyFatPercent", "Body fat (%)"),
	metricField("muscleMassKg", "Muscle mass (kg)"),
	metricField("visceralFatAreaCm2", "Visceral fat (cm²)"),
	metricField("bodyWaterL", "Body water (L)"),
] as const satisfies readonly AssessmentMetricField[];

/**
 * Table order. Height is deliberately absent: it is the one metric that does not
 * move between assessments, so it would be a constant column.
 */
export const ASSESSMENT_TABLE_METRICS = [
	{ label: "Weight (kg)", name: "weightKg" },
	{ label: "BMI", name: "bmi" },
	{ label: "Body fat (%)", name: "bodyFatPercent" },
	{ label: "Muscle (kg)", name: "muscleMassKg" },
	{ label: "Visceral fat", name: "visceralFatAreaCm2" },
	{ label: "Body water (L)", name: "bodyWaterL" },
] as const satisfies readonly { label: string; name: AssessmentMetricName }[];
