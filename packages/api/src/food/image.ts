// TODO(cloudinary): `packages/api/src/cloudinary/**` is owned by the Cloudinary
// pass of the overhaul and may not have landed yet. Every food-item Cloudinary
// call goes through this module, so if the shared helper ships under a
// different specifier this single import is the only line to fix.
import {
	buildCloudinaryUrl,
	deleteCloudinaryImage,
	uploadFileToCloudinary,
} from "../cloudinary/assets";

/**
 * Cloudinary asset lifecycle for food-item images.
 *
 * Only the `public_id` is persisted (`food_item.image_public_id`); the delivery
 * URL is derived on read. Uploads and destroys are external I/O and therefore
 * always happen **outside** the database transaction that writes the row.
 */

/** Cloudinary folder every food-item image is uploaded into. */
export const FOOD_ITEM_IMAGE_FOLDER = "food-items";

/** Delivery URL for a stored public id, or `null` when the item has no image. */
export function foodItemImageUrl(publicId: string | null): string | null {
	return publicId ? buildCloudinaryUrl(publicId) : null;
}

export interface FoodItemImageUpdate {
	clearImage?: boolean;
	file?: File;
}

/**
 * Resolves the next value of `image_public_id` for an update.
 *
 * Returns `null` to clear the column, a new public id to replace it, and
 * `undefined` to leave it untouched — the three states the caller has to
 * distinguish, which is why this is not simply `string | null`.
 *
 * The previous asset is destroyed **before** a replacement is uploaded so a
 * failed upload cannot leave two assets pointing at one row.
 */
export async function resolveFoodItemImageUpdate(
	existingPublicId: string | null,
	options?: FoodItemImageUpdate
): Promise<string | null | undefined> {
	if (options?.clearImage) {
		if (existingPublicId) {
			await deleteCloudinaryImage(existingPublicId);
		}
		return null;
	}

	if (options?.file) {
		if (existingPublicId) {
			await deleteCloudinaryImage(existingPublicId);
		}
		const { publicId } = await uploadFileToCloudinary(
			options.file,
			FOOD_ITEM_IMAGE_FOLDER
		);
		return publicId;
	}

	return;
}

/** Uploads a new food-item image and returns the public id to persist. */
export async function uploadFoodItemImage(file: File): Promise<string> {
	const { publicId } = await uploadFileToCloudinary(
		file,
		FOOD_ITEM_IMAGE_FOLDER
	);
	return publicId;
}
