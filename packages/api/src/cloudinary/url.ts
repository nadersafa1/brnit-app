import { requireCloudinaryCloudName } from "./configure";

/**
 * Delivery-URL helpers.
 *
 * brnit stores a bare `public_id` on every entity column (`image_public_id`)
 * and computes `imageUrl` on read. `user.image` is the one exception — it
 * holds the **full URL**, which is why {@link extractPublicId} exists.
 */

const CLOUDINARY_HOST_FRAGMENT = "cloudinary.com";
const UPLOAD_SEGMENT = "/upload/";

/** `v1710000000` — the optional version segment Cloudinary inserts on upload. */
const VERSION_SEGMENT_PATTERN = /^v\d+$/;

/** Everything from `?` or `#` onward is delivery options, not part of the id. */
const QUERY_OR_HASH_PATTERN = /[?#].*$/;

/** The canonical delivery URL for a stored `public_id`. */
export function buildCloudinaryUrl(publicId: string): string {
	return `https://res.cloudinary.com/${requireCloudinaryCloudName()}/image/upload/${publicId}`;
}

/** True when the value looks like a Cloudinary-hosted asset. */
export function isCloudinaryUrl(url: string | null | undefined): boolean {
	return typeof url === "string" && url.includes(CLOUDINARY_HOST_FRAGMENT);
}

/** Drops a file extension from the last path segment only. */
function stripExtension(segments: string[]): string {
	const lastIndex = segments.length - 1;
	const last = segments[lastIndex] ?? "";
	const dotIndex = last.lastIndexOf(".");
	if (dotIndex <= 0) {
		return segments.join("/");
	}
	return [...segments.slice(0, lastIndex), last.slice(0, dotIndex)].join("/");
}

/**
 * The `public_id` inside a Cloudinary delivery URL, or `null` when the URL is
 * not a Cloudinary asset (an OAuth avatar, say).
 *
 * Keeps the folder prefix: `.../image/upload/profile/abc.webp` yields
 * `profile/abc`, which is what `uploader.destroy` needs. A leading version
 * segment is dropped, so the versioned form `.../upload/v1710000000/sample.jpg`
 * still yields `sample`.
 */
export function extractPublicId(url: string): string | null {
	if (!isCloudinaryUrl(url)) {
		return null;
	}

	const uploadIndex = url.indexOf(UPLOAD_SEGMENT);
	if (uploadIndex === -1) {
		return null;
	}

	const afterUpload = url
		.slice(uploadIndex + UPLOAD_SEGMENT.length)
		.replace(QUERY_OR_HASH_PATTERN, "");

	const segments = afterUpload.split("/").filter((segment) => segment !== "");
	const withoutVersion = VERSION_SEGMENT_PATTERN.test(segments[0] ?? "")
		? segments.slice(1)
		: segments;

	if (withoutVersion.length === 0) {
		return null;
	}

	return stripExtension(withoutVersion);
}
