import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { RhMobilityStaffing } from "@/components/rh/mobility/RhMobilityStaffing";
import { WorkforceArbitrationView } from "@/components/rh/workforce-arbitration/WorkforceArbitrationView";
import type { RhActionsTab } from "@/components/routing/rh-actions-legacy-redirect";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useAuth } from "@/hooks/useAuth";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useRhRequestsSummaryQuery } from "@/hooks/use-rh-requests-decision";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { authStorage } from "@/lib/auth-storage";
import { RH_DASHBOARD_WEBHOOK_BASE } from "@/api/rh-dashboard.api";
import ManagerRequestsPage from "@/pages/rh/ManagerRequestsPage";
import { RH_ALERT_WARN } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

const VALID_TABS: readonly RhActionsTab[] = ["requests", "matching", "mobility"] as const;

const TAB_LABELS: Record<RhActionsTab, string> = {
    requests: "Demandes managers",
    matching: "Matchings IA",
    mobility: "Mobilité",
};

const SUBTITLES: Record<RhActionsTab, string> = {
    requests: "Demandes envoyées par les managers (recrutement, formation, réaffectation).",
    matching: "Matchmaker IA pour staffing stratégique sur projets.",
    mobility: "Mobilité interne et réaffectations planifiées.",
};

const TAB_ACTIVE_CLASS: Record<RhActionsTab, string> = {
    requests: "border-brand-secondary text-brand-secondary",
    matching: "border-brand-secondary text-brand-secondary",
    mobility: "border-brand-secondary text-brand-secondary",
};

export default function RhActionsPage() {
    const { user } = useAuth();
    const enterpriseId = user?.enterpriseId?.trim() ?? "";
    const token = authStorage.getAccessToken() ?? undefined;
    const [searchParams, setSearchParams] = useSearchParams();

    const rawTab = searchParams.get("tab");
    const tab: RhActionsTab = VALID_TABS.includes(rawTab as RhActionsTab) ? (rawTab as RhActionsTab) : "requests";

    const summaryQuery = useRhRequestsSummaryQuery();
    const summary = summaryQuery.data;

    const apiBase =
        (import.meta.env.VITE_RH_DASHBOARD_API_BASE as string | undefined)?.trim() || RH_DASHBOARD_WEBHOOK_BASE;

    const copilotView = useMemo(() => {
        if (tab === "matching") return "matching_run";
        if (tab === "mobility") return "assignments_staffing";
        return "manager_requests";
    }, [tab]);

    useCopilotPage("rh_actions", { enterpriseId, view: copilotView, tab });
    useWorkspaceTopbarMeta("Demandes & Actions RH", SUBTITLES[tab]);

    const setTab = (next: RhActionsTab) => {
        const params = new URLSearchParams(searchParams);
        params.set("tab", next);
        setSearchParams(params, { replace: false });
    };

    return (
        <WorkspacePageShell role="rh" title="Demandes & Actions RH" omitHeader>
            <div className="flex h-full flex-col">
                <div className="mb-4 flex gap-1 border-b border-secondary">
                    {VALID_TABS.map((id) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setTab(id)}
                            className={cx(
                                "flex items-center border-b-2 px-3 py-2 text-sm font-medium transition",
                                tab === id
                                    ? TAB_ACTIVE_CLASS[id]
                                    : "border-transparent text-tertiary hover:text-secondary",
                            )}
                        >
                            {TAB_LABELS[id]}
                            {id === "requests" && typeof summary?.total === "number" ? (
                                <span className="ml-1.5 rounded-full bg-secondary_subtle px-1.5 py-0.5 text-xs text-tertiary">
                                    {summary.total}
                                </span>
                            ) : null}
                            {id === "requests" && typeof summary?.urgent === "number" && summary.urgent > 0 ? (
                                <span className="ml-1 rounded-full bg-utility-error-50 px-1.5 py-0.5 text-xs font-medium text-utility-error-700">
                                    ⚠ {summary.urgent}
                                </span>
                            ) : null}
                        </button>
                    ))}
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                    {tab === "requests" ? <ManagerRequestsPage embedded /> : null}

                    {tab === "matching" ? (
                        !enterpriseId ? (
                            <div className={cx("p-4", RH_ALERT_WARN)}>
                                Connectez-vous avec un compte RH lié à une entreprise pour accéder au matching workforce.
                            </div>
                        ) : (
                            <WorkforceArbitrationView embedded token={token} />
                        )
                    ) : null}

                    {tab === "mobility" ? (
                        !enterpriseId ? (
                            <div className={cx("p-4", RH_ALERT_WARN)}>
                                Connectez-vous avec un compte RH lié à une entreprise pour gérer les affectations.
                            </div>
                        ) : (
                            <RhMobilityStaffing embedded enterpriseId={enterpriseId} apiBase={apiBase} token={token} />
                        )
                    ) : null}
                </div>
            </div>
        </WorkspacePageShell>
    );
}
