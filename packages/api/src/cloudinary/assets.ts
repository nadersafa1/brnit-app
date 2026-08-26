import { getLogger } from "@brnit/logger";
import { v2 as cloudinary } from "cloudinary";

import { HttpError } from "../http-error";
import { ensureCloudinaryConfigured } from "./configure";

/**
 * Asset lifecycle: upload a multipart buffer, destroy an asset by public id.
 *
 * Only the `public_id` is ever stored (`user.image` excepted — see
 * `./url.ts`), so callers keep the returned string, not the delivery URL.
 */

const UPLOAD_FAILED_MESSAGE = "Image upload failed";

interface CloudinaryUploadResult {
	public_id?: string;
}

/**
 * Streams an uploaded file into `folder` and returns its `public_id`.
 *
 * The buffer comes from multer's memory storage (`req.file.buffer`). Streaming
 * rather than base64-encoding keeps a 5 MB upload at 5 MB in memory instead of
 * inflating it by a third.
 */
export async function uploadFileToCloudinary(
	file: Buffer,
	folder: string
): Promise<string> {
	ensureCloudinaryConfigured();

	const result = await new Promise<CloudinaryUploadResult>(
		(resolve, reject) => {
			const uploadStream = cloudinary.uploader.upload_stream(
				{ folder, resource_type: "image" },
				(error, uploadResult) => {
					if (error) {
						reject(
							error instanceof Error ? error : new Error(UPLOAD_FAILED_MESSAGE)
						);
						return;
					}
					if (!uploadResult) {
						reject(new Error(UPLOAD_FAILED_MESSAGE));
						return;
					}
					resolve(uploadResult);
				}
			);
			uploadStream.end(file);
		}
	).catch((error: unknown) => {
		getLogger().error({ err: error, folder }, "cloudinary upload failed");
		throw new HttpError(502, UPLOAD_FAILED_MESSAGE);
	});

	if (!result.public_id) {
		throw new HttpError(502, "Cloudinary upload returned no public_id");
	}
	return result.public_id;
}

/**
 * Best-effort destroy. Returns whether Cloudinary reported `ok`.
 *
 * Deliberately never throws: every call site is a cleanup step next to a
 * database write that has already been decided, and failing the request
 * because a remote asset could not be removed would be worse than leaking it.
 */
export async function deleteCloudinaryImage(
	publicId: string | null | undefined
): Promise<boolean> {
	if (!publicId) {
		return false;
	}
	try {
		ensureCloudinaryConfigured();
		const result = await cloudinary.uploader.destroy(publicId);
		return result.result === "ok";
	} catch (error) {
		getLogger().error(
			{ err: error, publicId },
			"cloudinary image delete failed"
		);
		return false;
	}
}
