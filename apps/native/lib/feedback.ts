import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

/**
 * Central feedback: toast + haptics. Use these instead of Toast.show or Haptics directly
 * so success/error feel consistent and haptics are guarded on unsupported devices.
 */

function triggerHaptic(fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result?.catch) result.catch(() => {});
  } catch {
    // Haptics may not be supported on all devices
  }
}

export function showSuccess(text1: string, text2?: string): void {
  triggerHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  );
  Toast.show({ type: "success", text1, text2 });
}

export function showError(text1: string, text2?: string): void {
  triggerHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  );
  Toast.show({ type: "error", text1, text2 });
}

export function showInfo(text1: string, text2?: string): void {
  triggerHaptic(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  );
  Toast.show({ type: "info", text1, text2 });
}
