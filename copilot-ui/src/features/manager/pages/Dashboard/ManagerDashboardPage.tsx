import { HEALTH_META } from "@/features/manager/lib/dashboard-display";
import { useManagerDashboard } from "../../hooks/useManagerDashboard";
import { useManagerDashboardDensity } from "../../components/dashboard/use-manager-dashboard-density";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { DashboardInsightStrip } from "../../components/dashboard/DashboardInsightStrip";
import { CopilotEnginesStrip } from "../../components/dashboard/CopilotEnginesStrip";
import { DecisionPortfolioBar } from "../../components/dashboard/DecisionPortfolioBar";
import { ManagerDashboardStickyNav } from "../../components/dashboard/ManagerDashboardStickyNav";
import { ManagerDashboardDensityToggle } from "../../components/dashboard/ManagerDashboardDensityToggle";
import { PriorityActionsGrid } from "../../components/dashboard/PriorityActionsGrid";
import { KpiCardsRow } from "../../components/dashboard/KpiCardsRow";
import { DashboardTimeline } from "../../components/dashboard/DashboardTimeline";
import { MatchmakerSection } from "@/components/manager/matchmaker-section";
import { AnalystSection } from "@/components/manager/analyst-section";
import { FragileProjectsWidget } from "../../components/dashboard/widgets/FragileProjectsWidget";
import { TopAlertsWidget } from "../../components/dashboard/widgets/TopAlertsWidget";
import { HelperChatFAB } from "../../components/dashboard/HelperChatFAB";
import { MANAGER_DASHBOARD_SECTION_IDS } from "../../lib/copilot-engines";
import { cx } from "@/utils/cx";

export function ManagerDashboardPage() {
    const { data, isLoading, error, refetch, isFetching } = useManagerDashboard("mine");
    const { density, toggleDensity } = useManagerDashboardDensity();

    if (isLoading) return <DashboardSkeleton />;
    if (error || !data) return <ErrorState />;

    const healthMeta = HEALTH_META[data.health.label] ?? HEALTH_META.watch;
    const isCompact = density === "compact";

    return (
        <div className={cx("mx-auto max-w-[1280px] px-4 pt-1 pb-4 sm:px-6", isCompact ? "space-y-3" : "space-y-4")}>
            <DashboardHeader
                headline={data.headline}
                health={data.health}
                agentsActiveCount={data.agents_active_count}
                agentsTotal={data.agents_total}
                computedAt={data.meta.computed_at}
                onRefresh={() => void refetch()}
                isRefreshing={isFetching}
                trailingActions={<ManagerDashboardDensityToggle density={density} onToggle={toggleDensity} />}
            />

            <DashboardInsightStrip
                headline={data.headline}
                priorities={data.priorities}
                healthLabel={healthMeta.label}
            />

            <ManagerDashboardStickyNav />

            <KpiCardsRow kpi_cards={data.kpi_cards} />

            <DecisionPortfolioBar decisions={data.kpi_cards.decisions} />

            <CopilotEnginesStrip
                agentsStatus={data.agents_status}
                agents={data.agents}
                agentsActiveCount={data.agents_active_count}
                agentsTotal={data.agents_total}
            />

            <PriorityActionsGrid priorities={data.priorities} />

            <div id={MANAGER_DASHBOARD_SECTION_IDS.risk} className="scroll-mt-24 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                <FragileProjectsWidget projects={data.widgets.fragile_projects} />
                <TopAlertsWidget alerts={data.widgets.top_alerts} />
            </div>

            <MatchmakerSection />

            <AnalystSection />

            <div id={MANAGER_DASHBOARD_SECTION_IDS.actions} className="scroll-mt-24">
                <DashboardTimeline
                    pendingRhActions={data.widgets.pending_rh_actions}
                    decisions={data.widgets.recent_decisions}
                />
            </div>

            <HelperChatFAB />
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="mx-auto max-w-[1280px] space-y-4 px-4 pt-1 pb-4 sm:px-6">
            <div className="h-28 animate-pulse rounded-xl bg-secondary_subtle" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary_subtle" />
                ))}
            </div>
            <div className="h-8 w-2/3 animate-pulse rounded-full bg-secondary_subtle" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="h-56 animate-pulse rounded-xl bg-secondary_subtle" />
                <div className="h-56 animate-pulse rounded-xl bg-secondary_subtle" />
            </div>
            <div className="h-64 animate-pulse rounded-xl bg-secondary_subtle" />
            <div className="h-64 animate-pulse rounded-xl bg-secondary_subtle" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {[1, 2].map((i) => (
                    <div key={i} className="h-40 animate-pulse rounded-xl bg-secondary_subtle" />
                ))}
            </div>
        </div>
    );
}

function ErrorState() {
    return (
        <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6">
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="font-medium text-red-700">Erreur de chargement du dashboard</p>
                <p className="mt-1 text-sm text-red-600">Réessaie ou contacte le support.</p>
            </div>
        </div>
    );
}
