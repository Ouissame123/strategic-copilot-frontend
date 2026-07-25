import { useState } from "react";
import { Link } from "react-router";
import type {
    DashboardAgentsStatus,
    DashboardRiskAlert,
    ProjectFragilityItem,
    WatchdogSummary,
} from "@/features/manager/types/dashboard-v3";
import { managerProjectMissionControlPath, WORKSPACE_PREFIX } from "@/utils/workspace-routes";
import { blocCardClass } from "../dashboard-v3-ui";
import { AGENT_QUESTIONS, labelRiskType, labelSeverity } from "../lib/labels";
import { AgentChip } from "./AgentChip";
import { StatusBadge, severityToBadgeVariant } from "./StatusBadge";
import { TruncatedList } from "./TruncatedList";

type RisksTabProps = {
    summary: WatchdogSummary;
    alerts: DashboardRiskAlert[];
    byType: Array<{ risk_type: string; count: number }>;
    projectFragility: ProjectFragilityItem[];
    agentsStatus: DashboardAgentsStatus;
};

export function RisksTab({ summary, alerts, byType, projectFragility, agentsStatus }: RisksTabProps) {
    const [fragilityOpen, setFragilityOpen] = useState(false);

    return (
        <div className="ops-tab-fade space-y-3" data-agent="watchdog">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <AgentChip agentKey="watchdog" status={agentsStatus.watchdog} />
                    <p className="text-[13px] text-[color:var(--text-muted)]">{AGENT_QUESTIONS.watchdog}</p>
                </div>
                <Link
                    to={`${WORKSPACE_PREFIX.manager}/risks`}
                    className="ops-focus-ring text-[12px] font-medium text-[color:var(--accent)] hover:underline"
                >
                    Tous les risques →
                </Link>
            </div>

            <section className={blocCardClass("ops-agent-rail !p-3")}>
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                        { label: "Critiques", value: summary.critical, tone: "text-[color:var(--critical)]" },
                        { label: "Élevées", value: summary.high, tone: "text-[color:var(--warn)]" },
                        { label: "Moyennes", value: summary.medium, tone: "text-[color:var(--text)]" },
                        { label: "Nouvelles 24h", value: summary.new_24h, tone: "text-[color:var(--accent)]" },
                    ].map((kpi) => (
                        <div key={kpi.label} className="rounded-[10px] bg-[color:var(--surface-2)] px-3 py-2">
                            <p className="text-ops-section">{kpi.label}</p>
                            <p className={`font-ops-display text-[28px] font-semibold tabular-nums ${kpi.tone}`}>
                                {kpi.value}
                            </p>
                        </div>
                    ))}
                </div>

                {byType.length > 0 ? (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                        {byType.slice(0, 6).map((item) => (
                            <StatusBadge key={item.risk_type} variant="neutral">
                                {labelRiskType(item.risk_type)} · <span className="font-ops-data">{item.count}</span>
                            </StatusBadge>
                        ))}
                    </div>
                ) : null}

                <TruncatedList
                    items={alerts}
                    max={5}
                    sheetTitle="Toutes les alertes"
                    getKey={(a) => a.id}
                    empty={<p className="text-[13px] text-[color:var(--text-muted)]">Aucune alerte ouverte.</p>}
                    renderItem={(alert) => (
                        <div className="ops-card rounded-[10px] px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge variant={severityToBadgeVariant(alert.severity)}>
                                    {labelSeverity(alert.severity)}
                                </StatusBadge>
                                <span className="text-[12px] text-[color:var(--text-muted)]">
                                    {labelRiskType(alert.risk_type)}
                                </span>
                            </div>
                            <p className="mt-1 text-[13px] text-[color:var(--text)]">{alert.message}</p>
                            <Link
                                to={managerProjectMissionControlPath(alert.project_id)}
                                className="ops-focus-ring mt-1 inline-block text-[12px] text-[color:var(--accent)] hover:underline"
                            >
                                {alert.project_name}
                            </Link>
                        </div>
                    )}
                />
            </section>

            <section className={blocCardClass("ops-agent-rail !p-0")}>
                <button
                    type="button"
                    onClick={() => setFragilityOpen((v) => !v)}
                    className="ops-focus-ring flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] font-semibold text-[color:var(--text)]"
                >
                    Fragilité des projets
                    <span className="text-[12px] font-normal text-[color:var(--text-muted)]">
                        {fragilityOpen ? "Replier" : "Déplier"}
                    </span>
                </button>
                {fragilityOpen ? (
                    <div className="border-t border-[color:var(--border)] px-3 py-3">
                        {projectFragility.length === 0 ? (
                            <p className="text-[13px] text-[color:var(--text-muted)]">Aucune donnée de fragilité.</p>
                        ) : (
                            <ul className="space-y-2">
                                {[...projectFragility]
                                    .sort((a, b) => b.fragility_score - a.fragility_score)
                                    .slice(0, 8)
                                    .map((item) => (
                                        <li key={item.project_id} className="flex items-center justify-between text-[13px]">
                                            <span className="truncate text-[color:var(--text)]">{item.project_name}</span>
                                            <span className="font-ops-data tabular-nums text-[color:var(--text-muted)]">
                                                {item.fragility_score.toFixed(1)}
                                            </span>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                ) : null}
            </section>
        </div>
    );
}
