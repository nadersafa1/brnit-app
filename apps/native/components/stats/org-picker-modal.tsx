import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

export interface OrgOption {
	id: string;
	name: string;
}

type OrgPickerModalProps = Readonly<{
	visible: boolean;
	onClose: () => void;
	organizations: OrgOption[];
	selectedOrgId: string | null;
	onSelect: (id: string) => void;
	isLoading?: boolean;
}>;

export function OrgPickerModal({
	visible,
	onClose,
	organizations,
	selectedOrgId,
	onSelect,
	isLoading = false,
}: OrgPickerModalProps) {
	const colors = useColors();

	const handleSelect = useCallback(
		(id: string) => {
			onSelect(id);
			onClose();
		},
		[onSelect, onClose]
	);

	return (
		<Modal
			animationType="fade"
			onRequestClose={onClose}
			transparent
			visible={visible}
		>
			<Pressable
				onPress={onClose}
				style={[styles.modalBackdrop, { backgroundColor: colors.scrim }]}
			>
				<View
					onStartShouldSetResponder={() => true}
					style={[styles.modalContent, { backgroundColor: colors.card }]}
				>
					<Text size="lg" style={styles.modalTitle} weight="bold">
						Select organization
					</Text>
					{organizations.length === 0 ? (
						!isLoading && (
							<Text muted size="sm" style={styles.modalEmpty}>
								No organizations
							</Text>
						)
					) : (
						<FlatList
							data={organizations}
							keyExtractor={(item) => item.id}
							renderItem={({ item }) => (
								<Pressable
									onPress={() => handleSelect(item.id)}
									style={[
										styles.orgOption,
										item.id === selectedOrgId && {
											backgroundColor: colors.surfaceAlt,
										},
									]}
								>
									<Text size="base" weight="medium">
										{item.name}
									</Text>
									{item.id === selectedOrgId && (
										<Ionicons
											color={colors.accentFg}
											name="checkmark"
											size={20}
										/>
									)}
								</Pressable>
							)}
						/>
					)}
				</View>
			</Pressable>
		</Modal>
	);
}

const styles = StyleSheet.create({
	modalBackdrop: {
		flex: 1,
		justifyContent: "center",
		padding: spacing[4],
	},
	modalContent: {
		borderRadius: radii.xl,
		padding: spacing[4],
		maxHeight: 320,
	},
	modalTitle: {
		marginBottom: spacing[4],
	},
	modalEmpty: {
		paddingVertical: spacing[4],
	},
	orgOption: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: spacing[3],
		paddingHorizontal: spacing[3],
		borderRadius: radii.md,
	},
});
