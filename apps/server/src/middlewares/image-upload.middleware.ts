import { HttpError } from "@brnit/api";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import { jsonApiError } from "../utils/http.js";

/**
 * Upload limits, shared with the Zod schemas that validate the same forms.
 *
 * TODO(@brnit/api): move these to `@brnit/api/images/constants` once that
 * module exists, so the web and native clients can pre-validate against the
 * same numbers instead of hard-coding them.
 */
const BYTES_PER_MB = 1024 * 1024;

/** Ceiling enforced on every multipart image field across the API. */
export const MAX_IMAGE_UPLOAD_BYTES = 5 * BYTES_PER_MB;

/** The only image types Cloudinary is asked to store. */
export const ALLOWED_IMAGE_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
] as const;

/**
 * brnit's uploads are single-file multipart bodies with the field name `file`
 * (food items, body-composition assessments, profile avatars).
 */
export const IMAGE_UPLOAD_FIELD_NAME = "file";

const UNSUPPORTED_IMAGE_TYPE_MESSAGE = "Unsupported image type";
const FILE_TOO_LARGE_MESSAGE = "Image file is too large";

function isAllowedImageMimeType(mimetype: string): boolean {
	return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mimetype);
}

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_IMAGE_UPLOAD_BYTES },
	fileFilter: (_req, file, callback) => {
		if (isAllowedImageMimeType(file.mimetype)) {
			callback(null, true);
			return;
		}
		callback(new HttpError(400, UNSUPPORTED_IMAGE_TYPE_MESSAGE));
	},
});

const singleImageUpload = upload.single(IMAGE_UPLOAD_FIELD_NAME);

/**
 * Parses a multipart body into `req.file` (memory buffer) and `req.body` (text
 * fields). Must run before anything that reads form fields, since the fields do
 * not exist until multer has consumed the stream.
 */
export function handleImageUpload(
	req: Request,
	res: Response,
	next: NextFunction
): void {
	singleImageUpload(req, res, (err: unknown) => {
		// Section: success — `req.file?.buffer` is available downstream.
		if (!err) {
			next();
			return;
		}

		// Section: our own validation errors (unsupported MIME from fileFilter).
		if (err instanceof HttpError) {
			next(err);
			return;
		}

		// Section: multer limits and parse failures mapped to the JSON envelope.
		if (err instanceof multer.MulterError) {
			if (err.code === "LIMIT_FILE_SIZE") {
				jsonApiError(res, 413, FILE_TOO_LARGE_MESSAGE);
				return;
			}
			jsonApiError(res, 400, err.message);
			return;
		}

		const message = err instanceof Error ? err.message : "Image upload failed";
		jsonApiError(res, 400, message);
	});
}

/** Buffer for a required file field; throws 400 when the client omitted it. */
export function getUploadedImageBuffer(req: Request): Buffer {
	const file = req.file;
	if (!file?.buffer) {
		throw new HttpError(400, "Missing image file");
	}
	return file.buffer;
}
