import { Ionicons } from "@expo/vector-icons";
import type { BottomSheetFooterProps } from "@gorhom/bottom-sheet";
import { type Ref, useCallback } from "react";
import { Image, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppBottomSheet } from "@/components/bottom-sheet/app-bottom-sheet";
import { SheetFooter } from "@/components/bottom-sheet/sheet-footer";
import { DobPicker } from "@/components/dob-picker";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useEditProfileForm } from "@/hooks/use-edit-profile-form";
import { useColors } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

interface EditProfileSheetProps {
	/** ISO date string or Date (e.g. from session). */
	initialDob: string | Date | null;
	initialImageUrl: string | null;
	initialName: string;
	/** Called when the sheet is dismissed. Optional; sheet can be closed via ref. */
	onClose?: () => void;
	onSaveSuccess: () => void;
}

export interface EditProfileSheetRef {
	close: () => void;
	open: (snapIndex?: number) => void;
}

export const EditProfileSheet = function EditProfileSheet({
	initialName,
	initialDob,
	initialImageUrl,
	onSaveSuccess,
	onClose,
	ref,
}: EditProfileSheetProps & { ref?: Ref<EditProfileSheetRef | null> }) {
	const colors = useColors();

	const closeSheet = useCallback(() => {
		if (typeof ref === "object" && ref?.current) {
			ref.current.close();
		}
	}, [ref]);

	const form = useEditProfileForm({
		initialName,
		initialDob,
		initialImageUrl,
		onSaveSuccess,
		closeSheet,
	});

	const renderFooter = useCallback(
		(props: BottomSheetFooterProps) => (
			<SheetFooter {...props}>
				<View style={styles.footer}>
					<Button
						disabled={form.isSaving}
						onPress={closeSheet}
						style={styles.footerButton}
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={form.isSaving}
						onPress={form.save}
						style={styles.footerButton}
					>
						{form.isSaving ? <Spinner size="sm" /> : "Save"}
					</Button>
				</View>
			</SheetFooter>
		),
		[closeSheet, form.isSaving, form.save]
	);

	return (
		<AppBottomSheet
			footerComponent={renderFooter}
			headerTitle="Edit Profile"
			keyboardShouldPersistTaps
			onClose={onClose}
			ref={ref}
		>
			<AvatarSection
				canRemovePhoto={form.canRemovePhoto}
				colors={colors}
				displayImageUri={form.displayImageUri}
				displayName={form.displayName}
				onChangePhoto={form.pickImage}
				onRemovePhoto={form.removePhoto}
			/>

			<Text size="base" style={styles.label} weight="semibold">
				Name
			</Text>
			<TextInput
				accessibilityHint="Enter your display name"
				accessibilityLabel="Name"
				editable={!form.isSaving}
				maxLength={form.nameMaxLength}
				onChangeText={form.setName}
				placeholder="Your name"
				placeholderTextColor={colors.muted}
				style={[
					styles.input,
					{
						backgroundColor: colors.card,
						borderColor: colors.border,
						color: colors.ink,
					},
				]}
				value={form.name}
			/>

			<Text
				size="base"
				style={[styles.label, styles.labelTop]}
				weight="semibold"
			>
				Date of birth
			</Text>
			<DobPicker
				disabled={form.isSaving}
				onChange={form.setDob}
				placeholder="Select date of birth"
				value={form.dob}
			/>
		</AppBottomSheet>
	);
};

EditProfileSheet.displayName = "EditProfileSheet";

// --- Avatar block (photo + change/remove actions) ---

interface AvatarSectionProps {
	canRemovePhoto: boolean;
	colors: ReturnType<typeof useColors>;
	displayImageUri: string | null;
	displayName: string;
	onChangePhoto: () => void;
	onRemovePhoto: () => void;
}

function AvatarSection({
	displayImageUri,
	displayName,
	canRemovePhoto,
	onChangePhoto,
	onRemovePhoto,
	colors,
}: Readonly<AvatarSectionProps>) {
	return (
		<View style={styles.avatarSection}>
			<View style={[styles.avatarLarge, { backgroundColor: colors.accent }]}>
				{displayImageUri ? (
					<Image source={{ uri: displayImageUri }} style={styles.avatarImage} />
				) : (
					<Text size="3xl" style={{ color: colors.onAccent }} weight="bold">
						{displayName.charAt(0).toUpperCase()}
					</Text>
				)}
			</View>
			<View style={styles.avatarActions}>
				<Pressable
					accessibilityLabel="Change profile photo"
					accessibilityRole="button"
					onPress={onChangePhoto}
					style={({ pressed }) => [
						styles.avatarButton,
						{ backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.8 : 1 },
					]}
				>
					<Ionicons color={colors.ink} name="image-outline" size={18} />
					<Text size="sm" weight="medium">
						Change photo
					</Text>
				</Pressable>
				{canRemovePhoto && (
					<Pressable
						accessibilityLabel="Remove profile photo"
						accessibilityRole="button"
						onPress={onRemovePhoto}
						style={({ pressed }) => [
							styles.avatarButton,
							{
								backgroundColor: colors.surfaceAlt,
								opacity: pressed ? 0.8 : 1,
							},
						]}
					>
						<Ionicons color={colors.dangerFg} name="trash-outline" size={18} />
						<Text danger size="sm" weight="medium">
							Remove photo
						</Text>
					</Pressable>
				)}
			</View>
		</View>
	);
}

// --- Styles ---

const styles = StyleSheet.create({
	footer: {
		flexDirection: "column",
		gap: spacing[3],
	},
	footerButton: {
		flex: 1,
	},
	avatarSection: {
		alignItems: "center",
		marginBottom: spacing[5],
	},
	avatarLarge: {
		width: 80,
		height: 80,
		borderRadius: radii.pill,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: spacing[3],
		overflow: "hidden",
	},
	avatarImage: {
		width: "100%",
		height: "100%",
	},
	avatarActions: {
		flexDirection: "row",
		gap: spacing[3],
	},
	avatarButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing[2],
		paddingHorizontal: spacing[4],
		paddingVertical: spacing[2],
		borderRadius: radii.lg,
	},
	label: {
		marginBottom: spacing[2],
	},
	labelTop: {
		marginTop: spacing[4],
	},
	input: {
		borderWidth: 1,
		borderRadius: radii.sm,
		paddingHorizontal: spacing[4],
		height: 48,
		fontSize: 16,
	},
});
