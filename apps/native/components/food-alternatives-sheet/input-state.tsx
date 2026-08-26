import type { FoodItemDto } from "@brnit/api";
import type { FoodUnit } from "@brnit/domain";
import { Controller, type UseFormReturn } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { spacing } from "@/theme/spacing";
import type { QuantityFormValues } from "./schema";

function quantityLabel(unit: FoodUnit): string {
	if (unit === "100g") {
		return "Enter amount (grams)";
	}
	if (unit === "liters") {
		return "Enter amount (liters)";
	}
	if (unit === "cup") {
		return "Enter amount (cups)";
	}
	if (unit === "tbsp") {
		return "Enter amount (tbsp)";
	}
	return "Enter amount (pieces)";
}

function quantityPlaceholder(unit: FoodUnit): string {
	if (unit === "100g") {
		return "e.g. 150 (50g steps)";
	}
	if (unit === "liters") {
		return "e.g. 1 (0.5 L steps)";
	}
	if (unit === "cup" || unit === "tbsp") {
		return "e.g. 1 (0.5 steps)";
	}
	return "e.g. 2";
}

interface InputStateProps {
	foodItem: FoodItemDto | null;
	form: UseFormReturn<QuantityFormValues>;
}

export function InputState({ foodItem, form }: Readonly<InputStateProps>) {
	const {
		control,
		formState: { errors },
	} = form;
	const unit = foodItem?.unit ?? "100g";

	return (
		<View style={styles.container}>
			{foodItem && (
				<View style={styles.selectedFood}>
					<Text muted size="sm">
						Finding alternatives for:
					</Text>
					<Text size="base" weight="semibold">
						{foodItem.name}
					</Text>
				</View>
			)}

			<Text size="sm" style={styles.label} weight="medium">
				{quantityLabel(unit)}
			</Text>

			<Controller
				control={control}
				name="quantity"
				render={({ field: { onChange, onBlur, value } }) => (
					<Input
						error={!!errors.quantity}
						keyboardType="numeric"
						onBlur={onBlur}
						onChangeText={onChange}
						placeholder={quantityPlaceholder(unit)}
						value={value}
					/>
				)}
			/>

			{errors.quantity && (
				<FieldError error={errors.quantity.message ?? "Invalid quantity"} />
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingTop: spacing[2],
	},
	selectedFood: {
		marginBottom: spacing[4],
	},
	label: {
		marginBottom: spacing[2],
	},
});
