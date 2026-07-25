import { useTranslation } from "react-i18next";
import { RefreshCw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { DASHBOARD_AGENT_KEYS, type DashboardAgentsStatus } from "@/features/manager/types/dashboard-v3";
import { cx } from "@/utils/cx";

const AGENT_LABELS: Record<(typeof DASHBOARD_AGENT_KEYS)[number], string> = {
    observer: "Observer",
    watchdog: "Watchdog",
    strategist: "Strategist",
    matchmaker: "Matchmaker",
    analyst: "Analyst",
    helper: "Helper",
    orchestrator: "Orchestrator",
};

type AgentsStatusBarProps = {
    agentsStatus: DashboardAgentsStatus;
    activeCount: number;
    total: number;
    computedAt: string;
    durationMs: number;
    onRefresh: () => void;
    isRefreshing?: boolean;
};

export function AgentsStatusBar({
    agentsStatus,
    activeCount,
    total,
    computedAt,
    durationMs,
    onRefresh,
    isRefreshing,
}: AgentsStatusBarProps) {
    const { t } = useTranslation("common");
    const ta = (key: string) => t(`managerWorkspace.dashboard.agentsBar.${key}`);

    return (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--ws-border)] bg-ws-card/95 px-3 py-2 backdrop-blur">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-ws-muted">{ta("title")}</span>
                {DASHBOARD_AGENT_KEYS.map((key) => {
                    const status = agentsStatus[key] ?? { active: false, has_data: false };
                    const tone = !status.active
                        ? "bg-ws-muted-surface text-ws-muted ring-[color:var(--ws-border)]"
                        : status.has_data
                          ? "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200"
                          : "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200";
                    const dot = !status.active ? "bg-slate-300" : status.has_data ? "bg-emerald-500" : "bg-amber-500";
                    const hint = !status.active ? ta("inactive") : status.has_data ? "données" : "sans données";
                    return (
                        <span
                            key={key}
                            title={`${AGENT_LABELS[key]} — ${hint}`}
                            className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset", tone)}
                        >
                            <span className={cx("size-1.5 rounded-full", dot)} />
                            {AGENT_LABELS[key]}
                        </span>
                    );
                })}
                <span className="text-[10px] text-ws-muted">
                    {activeCount}/{total} {ta("active")}
                </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-ws-muted">
                {computedAt ? <span>{new Date(computedAt).toLocaleString()}</span> : null}
                {durationMs > 0 ? <span>{durationMs}ms</span> : null}
                <Button type="button" color="tertiary" size="sm" onClick={onRefresh} isDisabled={isRefreshing} iconLeading={RefreshCw01}>
                    {t("managerWorkspace.dashboard.refresh")}
                </Button>
            </div>
        </div>
    );
}
