import { useState } from "react";
import { AlertsSection } from "@/components/talent/dashboard/AlertsSection";
import { dashboardHeaderSubtitle } from "@/components/talent/dashboard/DashboardHeader";
import { TalentDashboardSkeleton } from "@/components/talent/dashboard/TalentDashboardSkeleton";
import { ActionRequiredBlock } from "@/components/talent/ActionRequiredBlock";
import { ActiveProjectsCard } from "@/components/talent/ActiveProjectsCard";
import { DashboardQuickChips } from "@/components/talent/DashboardQuickChips";
import { HeroBlock } from "@/components/talent/HeroBlock";
import { KpiRow } from "@/components/talent/KpiRow";
import { MyRequestsCard } from "@/components/talent/MyRequestsCard";
import { OpportunitiesCard } from "@/components/talent/OpportunitiesCard";
import { TopSkillsCard } from "@/components/talent/TopSkillsCard";
import { NotificationsDrawer } from "@/components/talent/layout/NotificationsDrawer";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useTalentNotificationsSummary } from "@/hooks/useTalentNotifications";
import { useTalentDashboard } from "@/hooks/useTalentDashboard";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";

const PAGE_STACK = "mx-auto max-w-7xl space-y-6 p-4 sm:p-6";

export default function TalentDashboard() {
    useCopilotPage();
    const query = useTalentDashboard();
    const { data: notificationsSummary } = useTalentNotificationsSummary();
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    const data = query.data;
    const topbarSubtitle = data?.header ? dashboardHeaderSubtitle(data.header) : null;
    useWorkspaceTopbarMeta(data?.header?.greeting ?? "Mon tableau de bord", topbarSubtitle);

    if (query.isLoading) {
        return <TalentDashboardSkeleton />;
    }

    if (query.error) {
        return (
            <ErrorState
                title="Dashboard indisponible"
                message="Impossible de charger votre tableau de bord."
                detail={query.error instanceof Error ? query.error.message : String(query.error)}
                onRetry={() => void query.refetch()}
            />
        );
    }

    if (!data) {
        return (
            <ErrorState
                title="Dashboard indisponible"
                message="Aucune donnée reçue du serveur."
                onRetry={() => void query.refetch()}
            />
        );
    }

    const opportunitiesCount = data.top_matches?.length ?? 0;
    const topMatch = data.top_matches?.[0];
    const featuredProjectId = topMatch?.project_id;
    const header = data.header;
    const unreadNotifications = notificationsSummary?.total_unread ?? 0;
    const pendingRequests = data.requests_summary?.pending ?? 0;
    const hasAlerts = (data.alerts?.length ?? 0) > 0 || data.contract_alert != null;

    return (
        <>
            <div className={PAGE_STACK}>
                {/* SECTION 1 — Hero */}
                <HeroBlock
                    firstName={header?.first_name ?? "Talent"}
                    role={header?.job_title ?? "—"}
                    specialty={header?.department}
                    level={header?.seniority_label}
                    globalScore={data.health?.score}
                    scoreLabel={data.health?.label}
                    hasHealthData={data.health?.has_data === true}
                    unreadNotifications={unreadNotifications}
                    onOpenNotifications={() => setNotificationsOpen(true)}
                />

                {/* SECTION 2 — KPI row */}
                {data.kpis ? (
                    <section aria-label="Indicateurs clés">
                        <KpiRow kpis={data.kpis} opportunitiesCount={opportunitiesCount} />
                    </section>
                ) : null}

                {/* SECTION 3 — Action required */}
                {topMatch ? (
                    <ActionRequiredBlock
                        topRecommendation={topMatch}
                        opportunitiesCount={opportunitiesCount}
                        pendingRequestsCount={pendingRequests}
                    />
                ) : (
                    <DashboardQuickChips
                        opportunitiesCount={opportunitiesCount}
                        pendingRequestsCount={pendingRequests}
                    />
                )}

                {/* SECTION 4 — Projets actifs + Opportunités IA */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <ActiveProjectsCard projects={data.active_projects} />
                    <OpportunitiesCard
                        opportunities={data.top_matches}
                        excludeProjectId={featuredProjectId}
                        totalCount={opportunitiesCount}
                    />
                </div>

                {/* SECTION 5 — Compétences + Demandes */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <TopSkillsCard skills={data.top_skills} stats={data.skills_stats} />
                    <MyRequestsCard summary={data.requests_summary} />
                </div>

                {/* Alertes backend (contrat, risques) — données réelles uniquement */}
                {hasAlerts ? (
                    <AlertsSection alerts={data.alerts} contractAlert={data.contract_alert} />
                ) : null}
            </div>

            <NotificationsDrawer open={notificationsOpen} onOpenChange={setNotificationsOpen} />
        </>
    );
}

/** Export nommé pour compatibilité avec les routes existantes. */
export function TalentDashboardPage() {
    return <TalentDashboard />;
}
