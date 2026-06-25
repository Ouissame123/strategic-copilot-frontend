import { useCallback, useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { Activity, AlertTriangle, BarChart3 } from "lucide-react";
import { OnboardTalentDialog } from "@/components/rh/accounts/page/OnboardTalentDialog";
import { AuditTimelineTab } from "@/components/rh/accounts-health/AuditTimelineTab";
import { OrphanedAccountsTab } from "@/components/rh/accounts-health/OrphanedAccountsTab";
import { StatsKpiGrid } from "@/components/rh/accounts-health/StatsKpiGrid";
import { useAccountsStats, useOrphanedAccounts } from "@/hooks/use-rh-accounts-audit";
import { useAuth } from "@/providers/auth-provider";
import { getDefaultWorkspacePath } from "@/utils/workspace-routes";
import { cx } from "@/utils/cx";

type HealthTab = "stats" | "anomalies" | "audit";

const TABS: { id: HealthTab; label: string; icon: typeof BarChart3 }[] = [
    { id: "stats", label: "Vue d'ensemble", icon: BarChart3 },
    { id: "anomalies", label: "Anomalies", icon: AlertTriangle },
    { id: "audit", label: "Activité récente", icon: Activity },
];

function AccountsHealthPageContent() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = (searchParams.get("tab") as HealthTab) || "stats";

    const [onboardOpen, setOnboardOpen] = useState(false);
    const [onboardTalentId, setOnboardTalentId] = useState<string | null>(null);

    const { data: orphaned } = useOrphanedAccounts(200);
    const statsQuery = useAccountsStats();
    const anomaliesCount = orphaned?.summary.total_orphaned ?? 0;

    const setTab = useCallback(
        (next: HealthTab) => {
            setSearchParams((prev) => {
                const p = new URLSearchParams(prev);
                p.set("tab", next);
                return p;
            });
        },
        [setSearchParams],
    );

    const handleOnboardTalent = useCallback((talentId: string) => {
        setOnboardTalentId(talentId);
        setOnboardOpen(true);
    }, []);

    return (
        <div className="mx-auto max-w-7xl p-6">
            <header className="mb-4 space-y-1">
                <h1 className="text-xl font-semibold text-primary">Santé des comptes</h1>
                <p className="text-sm text-tertiary">Vue d'ensemble · Détection d'anomalies · Audit trail</p>
            </header>

            <div className="space-y-4">
                <div className="flex flex-wrap gap-1 rounded-lg border border-secondary bg-secondary_subtle p-1">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setTab(id)}
                            className={cx(
                                "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition",
                                tab === id
                                    ? "bg-primary font-medium text-primary shadow-sm"
                                    : "text-tertiary hover:text-primary",
                            )}
                        >
                            <Icon className="size-3.5" aria-hidden />
                            {label}
                            {id === "anomalies" && anomaliesCount > 0 ? (
                                <span className="rounded-full bg-error-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                    {anomaliesCount}
                                </span>
                            ) : null}
                        </button>
                    ))}
                </div>

                {tab === "stats" ? (
                    <StatsKpiGrid dataUpdatedAt={statsQuery.dataUpdatedAt} isFetching={statsQuery.isFetching} />
                ) : null}
                {tab === "anomalies" ? <OrphanedAccountsTab onOnboardTalent={handleOnboardTalent} /> : null}
                {tab === "audit" ? <AuditTimelineTab /> : null}
            </div>

            <OnboardTalentDialog
                open={onboardOpen}
                onOpenChange={(open) => {
                    setOnboardOpen(open);
                    if (!open) setOnboardTalentId(null);
                }}
                initialMode="existing"
                initialTalentId={onboardTalentId}
            />
        </div>
    );
}

export default function AccountsHealthPage() {
    const { user, hasRole } = useAuth();

    if (!hasRole("rh")) {
        return <Navigate to={getDefaultWorkspacePath(user?.role)} replace />;
    }

    return <AccountsHealthPageContent />;
}
