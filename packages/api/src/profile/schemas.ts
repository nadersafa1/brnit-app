import { getTodayUtcDateString, isUtcDateString } from "@brnit/datetime";
import { z } from "zod";

/**
 * Input schema for `PATCH /me/profile`.
 *
 * The request is `multipart/form-data`, so every field arrives as a string and
 * an omitted field is indistinguishable from an empty one — blank values are
 * therefore normalized to `undefined` ("leave it alone") rather than rejected,
 * matching the pre-overhaul route.
 */

const MAX_NAME_LENGTH = 255;

const DOB_MESSAGE = "Date of birth must be a valid past date";

/** Blank strings mean "field not sent" for every multipart text field here. */
const optionalTrimmedString = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value === "" ? undefined : value));

/**
 * `dob` must be a real calendar date that is not in the future.
 *
 * Today itself is accepted — the pre-overhaul check was `!isAfter(today)`,
 * despite the "must be past" wording, and tightening it would start rejecting
 * newborn sign-ups that used to pass.
 */
const dobSchema = optionalTrimmedString.refine(
	(value) =>
		value === undefined ||
		(isUtcDateString(value) && value <= getTodayUtcDateString()),
	DOB_MESSAGE
);

export const updateProfileInputSchema = z.object({
	/** Only the exact string `"true"` clears the avatar. */
	clearImage: z
		.string()
		.optional()
		.transform((value) => value === "true"),
	dob: dobSchema,
	name: optionalTrimmedString.refine(
		(value) => value === undefined || value.length <= MAX_NAME_LENGTH,
		`Name must be at most ${MAX_NAME_LENGTH} characters`
	),
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
