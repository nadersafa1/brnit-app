import type { FoodItemAlternativeDto } from "@brnit/api";
import { mealQuantityStep, snapMealQuantityToStep } from "@brnit/domain";
import { Ionicons } from "@expo/vector-icons";
import type { BottomSheetFooterProps } from "@gorhom/bottom-sheet";
import { zodResolver } from "@hookform/resolvers/zod";
import { setStringAsync } from "expo-clipboard";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Pressable, StyleSheet, View } from "react-native";
import {
	AppBottomSheet,
	type AppBottomSheetRef,
} from "@/components/bottom-sheet/app-bottom-sheet";
import { SheetFooter } from "@/components/bottom-sheet/sheet-footer";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useFoodItemAlternatives } from "@/hooks/use-food-item-alternatives";
import { useColors } from "@/hooks/use-theme-color";
import { showError, showSuccess } from "@/lib/feedback";
import { formatQuantityWithUnit } from "@/lib/utils/numbers";
import { spacing } from "@/theme/spacing";
import { InputState } from "./input-state";
import { ResultsState } from "./results-state";
import { type QuantityFormValues, quantitySchema } from "./schema";
import type { FoodAlternativesSheetProps, SheetState } from "./types";

export function FoodAlternativesSheet({
	foodItem,
	onClose,
}: Readonly<FoodAlternativesSheetProps>) {
	const colors = useColors();
	const sheetRef = useRef<AppBottomSheetRef>(null);
	const [sheetState, setSheetState] = useState<SheetState>("input");
	const [quantity, setQuantity] = useState(0);

	const defaultQty = foodItem?.unit === "100g" ? "100" : "1";
	const form = useForm<QuantityFormValues>({
		resolver: zodResolver(quantitySchema),
		defaultValues: { quantity: defaultQty },
	});

	const { data, isLoading, isError } = useFoodItemAlternatives({
		foodItemId: foodItem?.id ?? "",
		quantity,
		enabled: sheetState === "results" && quantity > 0,
	});

	useEffect(() => {
		if (sheetState === "results" && isError) {
			showError("Failed to load alternatives");
		}
	}, [sheetState, isError]);

	useEffect(() => {
		if (foodItem) {
			const frameId = requestAnimationFrame(() => {
				sheetRef.current?.open(1);
			});
			setSheetState("input");
			const defaultQty = foodItem.unit === "100g" ? "100" : "1";
			form.reset({ quantity: defaultQty });
			return () => cancelAnimationFrame(frameId);
		}
		sheetRef.current?.close();
	}, [foodItem, form.reset]);

	const handleSheetClose = useCallback(() => {
		setSheetState("input");
		setQuantity(0);
		onClose();
	}, [onClose]);

	const handleSubmit = form.handleSubmit((values) => {
		const unit = foodItem?.unit ?? "100g";
		const n = Number(values.quantity);
		if (Math.abs(n - snapMealQuantityToStep(n, unit)) > 1e-5) {
			form.setError("quantity", {
				type: "manual",
				message: `Use multiples of ${mealQuantityStep(unit)} for this unit`,
			});
			return;
		}
		setQuantity(n);
		setSheetState("results");
	});

	const handleBack = useCallback(() => {
		setSheetState("input");
		setQuantity(0);
	}, []);

	const handleCopy = useCallback(async (alt: FoodItemAlternativeDto) => {
		const qtyText = formatQuantityWithUnit(alt.suggestedQuantity, alt.unit);
		const text = `${alt.name}: ${qtyText} (${alt.calories} kcal, P: ${alt.protein}g, C: ${alt.carbs}g, F: ${alt.fat}g)`;
		await setStringAsync(text);
		showSuccess("Copied", "Alternative copied to clipboard");
	}, []);

	const renderHeader = useCallback(
		() => (
			<View style={styles.header}>
				{sheetState === "results" && (
					<Pressable hitSlop={8} onPress={handleBack} style={styles.backButton}>
						<Ionicons color={colors.ink} name="chevron-back" size={24} />
					</Pressable>
				)}
				<Text size="lg" style={styles.title} weight="bold">
					{sheetState === "input" ? "Find Alternatives" : "Alternatives"}
				</Text>
			</View>
		),
		[sheetState, colors.ink, handleBack]
	);

	const renderFooter = useCallback(
		(props: BottomSheetFooterProps) =>
			sheetState === "input" ? (
				<SheetFooter {...props}>
					<Button onPress={handleSubmit} style={styles.footerButton}>
						Find Alternatives
					</Button>
				</SheetFooter>
			) : null,
		[sheetState, handleSubmit]
	);

	const alternatives = data?.data ?? [];

	return (
		<AppBottomSheet
			footerComponent={renderFooter}
			keyboardShouldPersistTaps
			onClose={handleSheetClose}
			ref={sheetRef}
			renderHeader={renderHeader}
		>
			{sheetState === "input" ? (
				<InputState foodItem={foodItem} form={form} />
			) : (
				<ResultsState
					alternatives={alternatives}
					foodItemName={foodItem?.name ?? ""}
					isError={isError}
					isLoading={isLoading}
					onCopy={handleCopy}
					quantity={quantity}
					quantityUnit={foodItem?.unit ?? "100g"}
				/>
			)}
		</AppBottomSheet>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: spacing[4],
		paddingBottom: spacing[2],
	},
	backButton: {
		marginRight: spacing[2],
	},
	title: {
		flex: 1,
	},
	footerButton: {
		flex: 1,
	},
});
