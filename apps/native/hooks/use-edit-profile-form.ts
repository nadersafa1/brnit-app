import { useQueryClient } from "@tanstack/react-query";
import {
	launchImageLibraryAsync,
	requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";

import { getProfileErrorMessage, updateProfile } from "@/lib/api/profile";
import { toIsoDateString } from "@/lib/date/dob";
import { showError, showSuccess } from "@/lib/feedback";
import { memberKeys } from "@/lib/queries/keys";

const NAME_MAX_LENGTH = 200;

export interface UseEditProfileFormParams {
	closeSheet: () => void;
	/** ISO date string or Date (e.g. from session). */
	initialDob: string | Date | null;
	initialImageUrl: string | null;
	initialName: string;
	onSaveSuccess: () => void;
}

/**
 * Form state and handlers for the edit profile bottom sheet.
 * Resets local state when initial values change (e.g. when sheet is opened with fresh session data).
 */
export function useEditProfileForm({
	initialName,
	initialDob,
	initialImageUrl,
	onSaveSuccess,
	closeSheet,
}: UseEditProfileFormParams) {
	const queryClient = useQueryClient();
	const [name, setName] = useState(initialName);
	const [dob, setDob] = useState(() => toIsoDateString(initialDob));
	const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
	const [userChoseRemove, setUserChoseRemove] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const displayImageUri = userChoseRemove
		? null
		: (selectedImageUri ?? initialImageUrl);
	const displayName = name.trim() || "User";
	const hasImageChange = selectedImageUri !== null || userChoseRemove;

	useEffect(() => {
		setName(initialName);
		setDob(toIsoDateString(initialDob));
		setSelectedImageUri(null);
		setUserChoseRemove(false);
	}, [initialName, initialDob]);

	const requestMediaPermission = useCallback(async (): Promise<boolean> => {
		const { status } = await requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			showError(
				"Permission needed",
				"Allow photo library access to change your profile photo."
			);
			return false;
		}
		return true;
	}, []);

	const pickImage = useCallback(async () => {
		const allowed = await requestMediaPermission();
		if (!allowed) {
			return;
		}

		const result = await launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		});

		if (result.canceled) {
			return;
		}
		const uri = result.assets[0]?.uri;
		if (uri) {
			setSelectedImageUri(uri);
			setUserChoseRemove(false);
		}
	}, [requestMediaPermission]);

	const removePhoto = useCallback(() => {
		setSelectedImageUri(null);
		setUserChoseRemove(true);
	}, []);

	const save = useCallback(async () => {
		const trimmedName = name.trim();
		if (!trimmedName) {
			showError("Name required", "Please enter your name.");
			return;
		}
		if (trimmedName.length > NAME_MAX_LENGTH) {
			showError(
				"Name too long",
				`Name must be ${NAME_MAX_LENGTH} characters or less.`
			);
			return;
		}

		const trimmedDob = dob.trim();
		const initialDobStr = toIsoDateString(initialDob);
		const hasChange =
			trimmedName !== initialName ||
			(trimmedDob || null) !== (initialDobStr || null) ||
			hasImageChange;
		if (!hasChange) {
			closeSheet();
			return;
		}

		setIsSaving(true);
		try {
			await updateProfile({
				name: trimmedName,
				dob: trimmedDob || null,
				imageUri: selectedImageUri ?? undefined,
				clearImage: userChoseRemove ? true : undefined,
			});
			// Leaderboard shows user name; refetch so it stays in sync after profile update.
			queryClient.invalidateQueries({
				queryKey: memberKeys.organizationLeaderboardAll(),
			});
			onSaveSuccess();
			showSuccess("Profile updated", "Your changes have been saved.");
			closeSheet();
		} catch (err) {
			showError("Update failed", getProfileErrorMessage(err));
		} finally {
			setIsSaving(false);
		}
	}, [
		name,
		dob,
		initialName,
		initialDob,
		selectedImageUri,
		userChoseRemove,
		hasImageChange,
		onSaveSuccess,
		closeSheet,
		queryClient,
	]);

	return {
		name,
		setName,
		dob,
		setDob,
		displayImageUri,
		displayName,
		hasImageChange,
		isSaving,
		pickImage,
		removePhoto,
		save,
		canRemovePhoto:
			(initialImageUrl != null || selectedImageUri != null) && !userChoseRemove,
		nameMaxLength: NAME_MAX_LENGTH,
	};
}
