import type { ProfileDto } from "@brnit/api";
import { queryOptions } from "@tanstack/react-query";

import { fetchApiJson } from "@/lib/api/client";
import { profileQueryKey } from "@/lib/api/query-keys";

const PROFILE_PATH = "/api/me/profile";

interface ProfileResponse {
	data: ProfileDto;
}

export function profileQueryOptions() {
	return queryOptions({
		queryFn: async () => {
			const response = await fetchApiJson<ProfileResponse>(PROFILE_PATH);
			return response.data;
		},
		queryKey: profileQueryKey(),
	});
}

export interface UpdateProfileFields {
	/** `"true"` clears the avatar; ignored when a `file` is supplied. */
	clearImage?: boolean;
	dob?: string;
	file?: File | null;
	name?: string;
}

/**
 * `PATCH /me/profile` is **multipart**, even without an avatar: the endpoint has
 * only ever parsed `multipart/form-data`, because the image and the text fields
 * arrive in one request. Blank strings are omitted — the server reads a blank
 * field as "leave it alone", but sending nothing is clearer.
 */
export async function updateProfile(
	fields: UpdateProfileFields
): Promise<ProfileDto> {
	const formData = new FormData();
	if (fields.name) {
		formData.append("name", fields.name);
	}
	if (fields.dob) {
		formData.append("dob", fields.dob);
	}
	if (fields.file) {
		formData.append("file", fields.file);
	} else if (fields.clearImage) {
		formData.append("clearImage", "true");
	}

	const response = await fetchApiJson<ProfileResponse>(PROFILE_PATH, {
		body: formData,
		method: "PATCH",
	});
	return response.data;
}
