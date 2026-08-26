import { Ionicons } from "@expo/vector-icons";
import { ImpactFeedbackStyle, impactAsync } from "expo-haptics";
import { type Href, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	LinearTransition,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";
import {
	fontSize as fontSizes,
	fontWeight as fontWeights,
} from "@/theme/typography";

type TabName = "home" | "search" | "stats" | "profile";

const TABS: {
	name: TabName;
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
}[] = [
	{ name: "home", icon: "home", label: "Home" },
	{ name: "search", icon: "search-outline", label: "Search" },
	{ name: "stats", icon: "bar-chart-outline", label: "Stats" },
	{ name: "profile", icon: "person-outline", label: "Profile" },
];

const TAB_ROUTES = {
	home: "/(tabs)",
	search: "/(tabs)/search",
	stats: "/(tabs)/stats",
	profile: "/(tabs)/profile",
} as const satisfies Record<TabName, Href>;

const TAB_NAMES = new Set<string>(TABS.map((tab) => tab.name));

/** Expo Router reports the active group segment; anything unknown means Home. */
function tabFromSegments(segments: string[]): TabName {
	const segment = segments[1];
	return segment !== undefined && TAB_NAMES.has(segment)
		? (segment as TabName)
		: "home";
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PILL_SPRING = { damping: 17, stiffness: 150, mass: 0.8 };

function pillSpringLayout() {
	return LinearTransition.springify()
		.damping(PILL_SPRING.damping)
		.stiffness(PILL_SPRING.stiffness)
		.mass(PILL_SPRING.mass);
}

interface NavItemProps {
	accentColor: string;
	activeColor: string;
	icon: keyof typeof Ionicons.glyphMap;
	iconColor: string;
	isActive: boolean;
	label: string;
	onPress: () => void;
}

function NavItem({
	icon,
	label,
	isActive,
	onPress,
	accentColor,
	activeColor,
	iconColor,
}: Readonly<NavItemProps>) {
	const scale = useSharedValue(1);
	const iconScale = useSharedValue(1);
	const pillOpacity = useSharedValue(isActive ? 1 : 0);
	const wasActive = useRef(isActive);

	useEffect(() => {
		pillOpacity.value = withTiming(isActive ? 1 : 0, { duration: 220 });

		if (isActive && !wasActive.current) {
			iconScale.value = withSequence(
				withSpring(1.25, { damping: 6, stiffness: 300 }),
				withSpring(1, { damping: 10, stiffness: 200 })
			);
		}
		wasActive.current = isActive;
	}, [isActive, pillOpacity, iconScale]);

	const pressAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const iconAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: iconScale.value }],
	}));

	const pillAnimatedStyle = useAnimatedStyle(() => ({
		opacity: pillOpacity.value,
	}));

	const handlePressIn = () => {
		scale.value = withSpring(0.88, { damping: 15, stiffness: 220 });
	};

	const handlePressOut = () => {
		scale.value = withSpring(1, { damping: 10, stiffness: 160 });
	};

	const handlePress = () => {
		if (Platform.OS === "ios") {
			impactAsync(ImpactFeedbackStyle.Light);
		}
		onPress();
	};

	return (
		<AnimatedPressable
			layout={pillSpringLayout()}
			onPress={handlePress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[styles.navItem, pressAnimatedStyle]}
		>
			<Animated.View
				style={[
					StyleSheet.absoluteFill,
					styles.pillBg,
					{ backgroundColor: accentColor },
					pillAnimatedStyle,
				]}
			/>

			<Animated.View
				layout={pillSpringLayout()}
				style={[styles.navItemContent, isActive && styles.activeNavItemContent]}
			>
				<Animated.View style={iconAnimatedStyle}>
					<Ionicons
						color={isActive ? activeColor : iconColor}
						name={icon}
						size={isActive ? 18 : 22}
					/>
				</Animated.View>
				{isActive && (
					<Animated.Text
						entering={FadeIn.duration(280).delay(60)}
						exiting={FadeOut.duration(120)}
						style={[styles.label, { color: activeColor }]}
					>
						{label}
					</Animated.Text>
				)}
			</Animated.View>
		</AnimatedPressable>
	);
}

interface BottomNavProps {
	activeTab?: TabName;
}

export function BottomNav({ activeTab }: Readonly<BottomNavProps>) {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const segments = useSegments();
	const colors = useColors();
	const elevation = useShadows();

	const currentTab = activeTab ?? tabFromSegments(segments);
	const inactiveIconColor = colors.chromeMuted;

	const navigate = useCallback(
		(tab: TabName) => {
			if (tab === currentTab) {
				return;
			}
			router.push(TAB_ROUTES[tab]);
		},
		[currentTab, router]
	);

	return (
		<Animated.View
			style={[
				styles.container,
				{ bottom: insets.bottom + 16, backgroundColor: colors.navPill },
				elevation.md,
			]}
		>
			{TABS.map((tab) => (
				<NavItem
					accentColor={colors.accent}
					activeColor={colors.onAccent}
					icon={tab.icon}
					iconColor={inactiveIconColor}
					isActive={currentTab === tab.name}
					key={tab.name}
					label={tab.label}
					onPress={() => navigate(tab.name)}
				/>
			))}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		left: spacing[4],
		right: spacing[4],
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: spacing[2],
		borderRadius: radii.pill,
	},
	navItem: {
		overflow: "hidden",
		borderRadius: radii.pill,
	},
	pillBg: {
		borderRadius: radii.pill,
	},
	navItemContent: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: spacing[4],
		height: 42,
	},
	activeNavItemContent: {
		paddingHorizontal: spacing[3],
		gap: spacing[1.5],
	},
	label: {
		fontSize: fontSizes.xs,
		fontWeight: fontWeights.bold,
		lineHeight: 16,
	},
});
