import { toDateStringUTC } from "@brnit/datetime";

/**
 * `GET`/`PATCH /me/profile` response.
 *
 * `image` is a **full URL**, not a Cloudinary public id. Profile is the one
 * place brnit stores the delivery URL on the row (`user.image`), because
 * better-auth also writes OAuth avatar URLs into that column — so the value
 * cannot be assumed to be a Cloudinary asset at all.
 */
export interface ProfileDto {
	dob: string | null;
	email: string;
	image: string | null;
	name: string;
}

/** `user.dob` is a `date` column; better-auth may hand it back as a `Date`. */
export function dobToDateString(
	dob: Date | string | null | undefined
): string | null {
	if (dob === null || dob === undefined) {
		return null;
	}
	if (dob instanceof Date) {
		return toDateStringUTC(dob);
	}
	return dob;
}

export interface ProfileSource {
	dob?: Date | string | null;
	email: string;
	image?: string | null;
	name: string;
}

export function profileToDto(user: ProfileSource): ProfileDto {
	return {
		dob: dobToDateString(user.dob),
		email: user.email,
		image: user.image ?? null,
		name: user.name,
	};
}
