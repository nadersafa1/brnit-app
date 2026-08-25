import type { MemberAssessmentDto } from "@brnit/api";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav } from "@/components/bottom-nav";
import { AssessmentDetailSheet } from "@/components/stats/assessment-detail-sheet";
import { CurrentStreakCard } from "@/components/stats/current-streak-card";
import { LeaderboardSection } from "@/components/stats/leaderboard-section";
import { OrgPickerModal } from "@/components/stats/org-picker-modal";
import { RecentAssessmentsSection } from "@/components/stats/recent-assessments-section";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useConsumptionStreak } from "@/hooks/use-consumption-streak";
import { useOrganizationLeaderboard } from "@/hooks/use-organization-leaderboard";
import { useRecentAssessments } from "@/hooks/use-recent-assessments";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { ApiError } from "@/lib/api/types";
import { authClient } from "@/lib/auth-client";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

const RECENT_ASSESSMENTS_LIMIT = 5;

/**
 * Stats tab: organization picker, recent assessments, leaderboard (by body-fat % drop),
 * and current consumption streak. Uses session active org from Better Auth.
 */
export default function Stats() {
	const insets = useSafeAreaInsets();
	const colors = useColors();
	const elevation = useShadows();
	const [orgPickerVisible, setOrgPickerVisible] = useState(false);
	const [selectedAssessment, setSelectedAssessment] =
		useState<MemberAssessmentDto | null>(null);

	const { data: activeOrg } = authClient.useActiveOrganization();
	const { data: orgsList, isPending: orgsLoading } =
		authClient.useListOrganizations();

	// Stable list for picker + effects (avoid new array identity every render).
	const organizations = useMemo(
		() => (orgsList ?? []).map((o) => ({ id: o.id, name: o.name })),
		[orgsList]
	);
	const selectedOrgId = activeOrg?.id ?? null;
	const singleOrgId = organizations.length === 1 ? organizations[0].id : null;
	/** Org used for stats API calls: session active org, or the sole org before setActive finishes. Avoids an unscoped fetch then a second scoped fetch. */
	const statsOrgId = selectedOrgId ?? singleOrgId;

	// Side effect: single-org members need an active org id for leaderboard / assessments queries.
	useEffect(() => {
		if (singleOrgId && selectedOrgId === null) {
			authClient.organization.setActive({ organizationId: singleOrgId });
		}
	}, [selectedOrgId, singleOrgId]);

	const { data: assessmentsData, isLoading: assessmentsQueryLoading } =
		useRecentAssessments({
			limit: RECENT_ASSESSMENTS_LIMIT,
			orgId: statsOrgId,
			enabled: statsOrgId != null,
		});

	const {
		data: leaderboardData,
		isLoading: leaderboardLoading,
		error: leaderboardError,
		isError: leaderboardIsError,
	} = useOrganizationLeaderboard({
		orgId: statsOrgId,
		enabled: statsOrgId != null,
	});
	// 400 from leaderboard API means user is not a member of the selected org.
	const isNoOrgError =
		leaderboardIsError &&
		leaderboardError instanceof ApiError &&
		leaderboardError.status === 400;

	const {
		data: streakData,
		isLoading: streakLoading,
		error: streakError,
	} = useConsumptionStreak();
	const selectedOrgName =
		activeOrg?.name ??
		organizations.find((o) => o.id === statsOrgId)?.name ??
		null;

	const assessmentsLoading =
		orgsLoading || (statsOrgId != null && assessmentsQueryLoading);

	const handleSelectOrg = useCallback((id: string) => {
		authClient.organization.setActive({ organizationId: id });
		setOrgPickerVisible(false);
	}, []);

	return (
		<View style={[styles.container, { backgroundColor: colors.appBg }]}>
			<View
				style={[styles.decorativeBlob, { backgroundColor: colors.decorative }]}
			/>

			<ScrollView
				contentContainerStyle={[
					styles.content,
					{
						paddingTop: insets.top + 16,
						paddingBottom: insets.bottom + 96,
					},
				]}
				showsVerticalScrollIndicator={false}
				style={styles.scrollView}
			>
				<Text size="2xl" style={styles.title} weight="bold">
					Statistics
				</Text>

				<Pressable
					onPress={() => setOrgPickerVisible(true)}
					style={[
						styles.orgPicker,
						{ backgroundColor: colors.card },
						elevation.sm,
					]}
				>
					<Text muted size="sm" weight="medium">
						Organization
					</Text>
					<View style={styles.orgPickerValue}>
						{orgsLoading ? (
							<Spinner color={colors.muted} size="sm" />
						) : (
							<Text
								numberOfLines={1}
								size="base"
								style={selectedOrgName ? undefined : { color: colors.muted }}
								weight="semibold"
							>
								{selectedOrgName ?? "Select organization"}
							</Text>
						)}
						<Ionicons color={colors.muted} name="chevron-down" size={18} />
					</View>
				</Pressable>

				<OrgPickerModal
					isLoading={orgsLoading}
					onClose={() => setOrgPickerVisible(false)}
					onSelect={handleSelectOrg}
					organizations={organizations}
					selectedOrgId={statsOrgId}
					visible={orgPickerVisible}
				/>

				<RecentAssessmentsSection
					assessments={assessmentsData?.assessments ?? []}
					isLoading={assessmentsLoading}
					onSelectAssessment={setSelectedAssessment}
				/>

				<LeaderboardSection
					data={leaderboardData}
					isError={leaderboardIsError}
					isLoading={leaderboardLoading}
					isNoOrgError={isNoOrgError}
					selectedOrgId={statsOrgId}
				/>

				<CurrentStreakCard
					error={streakError}
					isLoading={streakLoading}
					streak={streakData?.streak ?? 0}
				/>
			</ScrollView>

			<BottomNav activeTab="stats" />
			<AssessmentDetailSheet
				assessment={selectedAssessment}
				onClose={() => setSelectedAssessment(null)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	decorativeBlob: {
		position: "absolute",
		top: -80,
		right: -80,
		width: 256,
		height: 256,
		borderRadius: radii.pill,
	},
	scrollView: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
		paddingHorizontal: spacing[4],
	},
	title: {
		marginBottom: spacing[4],
	},
	orgPicker: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: spacing[3],
		paddingHorizontal: spacing[4],
		borderRadius: radii.lg,
		marginBottom: spacing[4],
	},
	orgPickerValue: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing[2],
		flex: 1,
		justifyContent: "flex-end",
	},
});
