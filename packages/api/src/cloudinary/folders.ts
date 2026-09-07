/**
 * The three Cloudinary folders brnit uploads into.
 *
 * Flat, entity-shaped names, unchanged from the Next.js routes — existing
 * assets already live under these prefixes, so renaming one would orphan
 * every image uploaded before the rename.
 */

/** Admin food-item photos. */
export const CLOUDINARY_FOOD_ITEM_FOLDER = "food-items";

/** Body-composition assessment scans (direct-admin uploads). */
export const CLOUDINARY_ASSESSMENT_FOLDER = "body-composition-assessments";

/** Member profile avatars. Stored on `user.image` as a full URL, not a public id. */
export const CLOUDINARY_PROFILE_FOLDER = "profile";
