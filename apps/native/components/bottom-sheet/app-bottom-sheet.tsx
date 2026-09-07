import type { BottomSheetFooterProps } from "@gorhom/bottom-sheet";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { type Ref, useCallback, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-theme-color";
import { spacing } from "@/theme/spacing";

import { DEFAULT_SNAP_POINTS } from "./constants";
import { SheetBackdrop } from "./sheet-backdrop";

export interface AppBottomSheetRef {
	close: () => void;
	open: (snapIndex?: number) => void;
}

export interface AppBottomSheetProps {
	/** Sheet body. Rendered inside BottomSheetScrollView with shared content padding. */
	children: React.ReactNode;
	/** Optional footer. Use SheetFooter for consistent container styling. */
	footerComponent?: (props: BottomSheetFooterProps) => React.ReactNode;
	/** Simple header: title only. Ignored if renderHeader is provided. */
	headerTitle?: string;
	/** Set true for forms so the keyboard does not dismiss on tap. */
	keyboardShouldPersistTaps?: boolean;
	/** Called when the sheet is closed (pan down or programmatic close). */
	onClose?: () => void;
	/** Custom header (e.g. title + back button). Overrides headerTitle. */
	renderHeader?: () => React.ReactNode;
	/** Override default snap points if needed (e.g. dynamic sizing). */
	snapPoints?: readonly string[] | string[];
}

function renderHeaderContent(
	headerTitle?: string,
	renderHeader?: () => React.ReactNode
): React.ReactNode {
	if (renderHeader) {
		return renderHeader();
	}
	if (headerTitle != null) {
		return (
			<View style={styles.header}>
				<Text size="lg" weight="bold">
					{headerTitle}
				</Text>
			</View>
		);
	}
	return null;
}

export const AppBottomSheet = function AppBottomSheet({
	snapPoints,
	onClose,
	headerTitle,
	renderHeader,
	footerComponent,
	children,
	keyboardShouldPersistTaps = false,
	ref,
}: AppBottomSheetProps & { ref?: Ref<AppBottomSheetRef | null> }) {
	const colors = useColors();
	const bottomSheetRef = useRef<BottomSheetModal>(null);
	const points = snapPoints ?? DEFAULT_SNAP_POINTS;

	const open = useCallback(
		(snapIndex = 0) => {
			const sheet = bottomSheetRef.current;
			if (!sheet) {
				return;
			}

			const targetIndex = Math.max(0, Math.min(snapIndex, points.length - 1));
			sheet.present();

			requestAnimationFrame(() => {
				if (targetIndex > 0) {
					sheet.snapToIndex(targetIndex);
				}
			});
		},
		[points.length]
	);

	const close = useCallback(() => {
		bottomSheetRef.current?.dismiss();
	}, []);

	useImperativeHandle(ref, () => ({ open, close }), [open, close]);

	return (
		<BottomSheetModal
			android_keyboardInputMode="adjustResize"
			backdropComponent={SheetBackdrop}
			backgroundStyle={{ backgroundColor: colors.appBg }}
			enableDynamicSizing={false}
			enablePanDownToClose
			footerComponent={footerComponent}
			handleIndicatorStyle={{ backgroundColor: colors.decorative }}
			index={0}
			keyboardBehavior="interactive"
			onDismiss={onClose}
			ref={bottomSheetRef}
			snapPoints={[...points]}
		>
			{renderHeaderContent(headerTitle, renderHeader)}
			<BottomSheetScrollView
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps={
					keyboardShouldPersistTaps ? "handled" : "never"
				}
				showsVerticalScrollIndicator={false}
				style={styles.content}
			>
				{children}
			</BottomSheetScrollView>
		</BottomSheetModal>
	);
};

AppBottomSheet.displayName = "AppBottomSheet";

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: spacing[4],
		paddingBottom: spacing[2],
	},
	content: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: spacing[4],
		paddingBottom: spacing[4],
	},
});
