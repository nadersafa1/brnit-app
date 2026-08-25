import type { IncomingHttpHeaders } from "node:http";

import { auth } from "@brnit/auth";

import {
	deleteCloudinaryImage,
	uploadFileToCloudinary,
} from "../cloudinary/assets";
import { CLOUDINARY_PROFILE_FOLDER } from "../cloudinary/folders";
import { buildCloudinaryUrl, extractPublicId } from "../cloudinary/url";
import type { Context } from "../context";
import { requireContextUser } from "../context";
import { HttpError } from "../http-error";
import type { ProfileDto } from "../profile/dto";
import { dobToDateString, profileToDto } from "../profile/dto";
import type { UpdateProfileInput } from "../profile/schemas";

/**
 * `/me/profile` — the only endpoints that write through better-auth rather
 * than Drizzle, because `user` rows are owned by the auth package (sessions
 * have to be refreshed alongside the change).
 */

const NOTHING_TO_UPDATE_MESSAGE =
	"At least one of name, dob, image file, or clearImage must be provided";
const UPDATE_FAILED_MESSAGE = "Failed to update profile";

export interface UpdateProfileHandlerInput extends UpdateProfileInput {
	/** Multipart image buffer from `req.file`, when one was attached. */
	file?: Buffer;
}

/**
 * better-auth's server API speaks Web `Headers`; Express hands us Node's
 * plain object. Same conversion `better-auth/node`'s `fromNodeHeaders` does,
 * inlined so `@brnit/api` keeps a single auth dependency.
 */
function toWebHeaders(headers: IncomingHttpHeaders): Headers {
	const webHeaders = new Headers();
	for (const [key, value] of Object.entries(headers)) {
		if (Array.isArray(value)) {
			for (const entry of value) {
				webHeaders.append(key, entry);
			}
			continue;
		}
		if (value !== undefined) {
			webHeaders.set(key, value);
		}
	}
	return webHeaders;
}

/** Destroys the previous avatar when — and only when — it is ours to destroy. */
async function deletePreviousProfileImage(
	previousImageUrl: string | null | undefined
): Promise<void> {
	if (!previousImageUrl) {
		return;
	}
	const publicId = extractPublicId(previousImageUrl);
	if (publicId) {
		await deleteCloudinaryImage(publicId);
	}
}

/**
 * The value to write to `user.image`: a new URL, `null` to clear, or
 * `undefined` to leave the column untouched.
 */
async function resolveNextImageUrl(
	input: UpdateProfileHandlerInput,
	previousImageUrl: string | null | undefined
): Promise<string | null | undefined> {
	if (input.file) {
		// Upload and cleanup are independent; the new asset does not depend on
		// the old one being gone.
		const [publicId] = await Promise.all([
			uploadFileToCloudinary(input.file, CLOUDINARY_PROFILE_FOLDER),
			deletePreviousProfileImage(previousImageUrl),
		]);
		return buildCloudinaryUrl(publicId);
	}
	if (input.clearImage) {
		await deletePreviousProfileImage(previousImageUrl);
		return null;
	}
	return;
}

export function getProfile(ctx: Context): ProfileDto {
	const user = requireContextUser(ctx);
	return profileToDto(user);
}

export async function updateProfile(
	ctx: Context,
	input: UpdateProfileHandlerInput
): Promise<ProfileDto> {
	const user = requireContextUser(ctx);

	const hasChange =
		input.name !== undefined ||
		input.dob !== undefined ||
		input.clearImage ||
		input.file !== undefined;
	if (!hasChange) {
		throw new HttpError(400, NOTHING_TO_UPDATE_MESSAGE);
	}

	const imageUrl = await resolveNextImageUrl(input, user.image);

	const body: { dob?: Date; image?: string | null; name?: string } = {};
	if (input.name !== undefined) {
		body.name = input.name;
	}
	if (input.dob !== undefined) {
		body.dob = new Date(input.dob);
	}
	if (imageUrl !== undefined) {
		body.image = imageUrl;
	}

	const updated = await auth.api.updateUser({
		body,
		headers: toWebHeaders(ctx.headers),
	});
	if (!updated) {
		throw new HttpError(500, UPDATE_FAILED_MESSAGE);
	}

	return {
		dob: input.dob ?? dobToDateString(user.dob),
		email: user.email,
		image: imageUrl === undefined ? (user.image ?? null) : imageUrl,
		name: input.name ?? user.name,
	};
}
