import {
	ImpactFeedbackStyle,
	impactAsync,
	NotificationFeedbackType,
	notificationAsync,
} from "expo-haptics";
import Toast from "react-native-toast-message";

/**
 * Central feedback: toast + haptics. Use these instead of Toast.show or Haptics directly
 * so success/error feel consistent and haptics are guarded on unsupported devices.
 */

/**
 * Haptics are decorative: a device without a Taptic Engine, or a simulator,
 * rejects or throws and that must never surface to the user. Both the sync
 * throw and the async rejection are swallowed on purpose.
 */
function triggerHaptic(fn: () => void | Promise<void>): void {
	try {
		const result = fn();
		if (result?.catch) {
			result.catch(ignoreUnsupportedHaptics);
		}
	} catch {
		ignoreUnsupportedHaptics();
	}
}

function ignoreUnsupportedHaptics(): undefined {
	return;
}

export function showSuccess(text1: string, text2?: string): void {
	triggerHaptic(() => notificationAsync(NotificationFeedbackType.Success));
	Toast.show({ type: "success", text1, text2 });
}

export function showError(text1: string, text2?: string): void {
	triggerHaptic(() => notificationAsync(NotificationFeedbackType.Error));
	Toast.show({ type: "error", text1, text2 });
}

export function showInfo(text1: string, text2?: string): void {
	triggerHaptic(() => impactAsync(ImpactFeedbackStyle.Light));
	Toast.show({ type: "info", text1, text2 });
}
