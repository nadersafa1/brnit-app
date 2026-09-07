import type { ProfileDto } from "@brnit/api";

import { apiFetch } from "./client";
import { ApiError } from "./types";

export interface UpdateProfileOptions {
	clearImage?: boolean;
	dob?: string | null;
	imageUri?: string | null;
	name?: string;
}

/**
 * `PATCH /me/profile`, multipart because the avatar rides along with the text
 * fields. Only defined, non-empty values are appended; the server validates
 * that `dob` is a real past date and that at least one field changed.
 *
 * Refetch the better-auth session afterwards so `session.user` catches up.
 */
export function updateProfile(
	options: UpdateProfileOptions
): Promise<ProfileDto> {
	const formData = new FormData();

	const name = options.name?.trim();
	if (name) {
		formData.append("name", name);
	}

	const dob = options.dob?.trim();
	if (dob) {
		formData.append("dob", dob);
	}

	if (options.imageUri) {
		formData.append("file", {
			name: "photo.jpg",
			type: "image/jpeg",
			uri: options.imageUri,
		} as unknown as Blob);
	}

	if (options.clearImage === true) {
		formData.append("clearImage", "true");
	}

	return apiFetch<ProfileDto>("/api/me/profile", {
		method: "PATCH",
		body: formData,
	});
}

/** Short, user-facing message for a profile toast. */
export function getProfileErrorMessage(error: unknown): string {
	if (error instanceof ApiError || error instanceof Error) {
		return error.message;
	}
	return "Something went wrong";
}
