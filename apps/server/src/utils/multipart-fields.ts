import type { Request, Response } from "express";
import { flattenError, type z } from "zod";

import { jsonApiError } from "./http.js";

/**
 * Validates the text fields multer parsed out of a multipart body.
 *
 * brnit's mutating image endpoints (food items, assessments, profile) are all
 * multipart, so every value arrives as a string — schemas must coerce.
 */
export function parseMultipartFields<T>(
	req: Request,
	res: Response,
	schema: z.ZodType<T>
): T | undefined {
	const parsed = schema.safeParse(req.body ?? {});
	if (!parsed.success) {
		jsonApiError(res, 400, "Invalid form fields", flattenError(parsed.error));
		return;
	}
	return parsed.data;
}
