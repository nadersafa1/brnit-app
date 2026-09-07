import {
	deleteCloudinaryImage,
	uploadFileToCloudinary,
} from "../cloudinary/assets";
import { CLOUDINARY_FOOD_ITEM_FOLDER } from "../cloudinary/folders";

/**
 * Cloudinary asset lifecycle for food-item images.
 *
 * Only the `public_id` is persisted (`food_item.image_public_id`); the delivery
 * URL is derived on read in `./dto`. Uploads and destroys are external I/O and
 * therefore always happen **outside** the transaction that writes the row.
 */

export interface FoodItemImageUpdate {
	clearImage?: boolean;
	/** Multipart image buffer from `req.file`, when one was attached. */
	file?: Buffer;
}

/** Uploads a new food-item image and returns the public id to persist. */
export async function uploadFoodItemImage(file: Buffer): Promise<string> {
	return await uploadFileToCloudinary(file, CLOUDINARY_FOOD_ITEM_FOLDER);
}

/**
 * Resolves the next value of `image_public_id` for an update.
 *
 * Returns `null` to clear the column, a new public id to replace it, and
 * `undefined` to leave it untouched — the three states the caller has to
 * distinguish, which is why this is not simply `string | null`.
 *
 * The previous asset is destroyed **before** a replacement is uploaded, so a
 * failed upload cannot leave two assets pointing at one row.
 */
export async function resolveFoodItemImageUpdate(
	existingPublicId: string | null,
	options?: FoodItemImageUpdate
): Promise<string | null | undefined> {
	if (options?.clearImage) {
		await deleteCloudinaryImage(existingPublicId);
		return null;
	}

	if (options?.file) {
		await deleteCloudinaryImage(existingPublicId);
		return await uploadFoodItemImage(options.file);
	}

	return;
}
