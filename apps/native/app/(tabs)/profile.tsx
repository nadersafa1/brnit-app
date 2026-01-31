import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { authClient } from "@/lib/auth-client";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await authClient.signOut();
            router.replace("/(auth)");
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View className="flex-1 bg-app-bg">
      {/* Decorative Corner Blob */}
      <View className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-pastel-purple" />

      <View
        className="flex-1 px-4"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 }}
      >
        <Text className="text-2xl font-bold text-ink mb-6">Profile</Text>

        {/* Profile Header */}
        <View className="bg-card rounded-xl p-5 shadow-md mb-4 items-center">
          <View className="w-20 h-20 rounded-full bg-accent items-center justify-center mb-3">
            <Text className="text-3xl font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-xl font-bold text-ink">{userName}</Text>
          <Text className="text-sm text-muted">{userEmail}</Text>
        </View>

        {/* Settings List */}
        <View className="bg-card rounded-xl shadow-md overflow-hidden">
          <SettingsRow icon="person-outline" label="Edit Profile" />
          <SettingsRow icon="notifications-outline" label="Notifications" />
          <SettingsRow icon="fitness-outline" label="Goals" />
          <SettingsRow icon="help-circle-outline" label="Help & Support" />
        </View>

        {/* Sign Out */}
        <Pressable
          className="bg-card rounded-xl p-4 mt-4 shadow-md flex-row items-center justify-center active:scale-[0.98]"
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF4D4F" />
          <Text className="text-base font-semibold text-danger ml-2">Sign Out</Text>
        </Pressable>
      </View>

      <BottomNav activeTab="profile" />
    </View>
  );
}

function SettingsRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <Pressable className="flex-row items-center px-4 py-4 border-b border-border active:bg-surface-alt">
      <View className="w-9 h-9 rounded-xl bg-surface-alt items-center justify-center">
        <Ionicons name={icon} size={18} color="#3A3A3A" />
      </View>
      <Text className="flex-1 text-base font-medium text-ink ml-3">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#6B6B6B" />
    </Pressable>
  );
}
