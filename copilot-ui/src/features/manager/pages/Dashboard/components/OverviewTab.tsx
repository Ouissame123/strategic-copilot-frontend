import type { ReactNode } from "react";
import type { ManagerDashboardV3Response } from "@/features/manager/types/dashboard-v3";
import { blocCardClass } from "../dashboard-v3-ui";
import { AGENT_QUESTIONS, labelDecision } from "../lib/labels";
import { ActivityFeed } from "./ActivityFeed";
import { AgentChip } from "./AgentChip";
import type { DashboardTabId } from "./DashboardTabs";
import { StatusBadge } from "./StatusBadge";

type OverviewTabProps = {
    data: ManagerDashboardV3Response;
    onOpenTab: (tab: DashboardTabId) => void;
};

function BentoCard({
    title,
    children,
    onOpen,
    openLabel,
    agent,
}: {
    title: string;
    children: ReactNode;
    onOpen: () => void;
    openLabel: string;
    agent: "observer" | "watchdog" | "matchmaker" | "orchestrator";
}) {
    return (
        <section data-agent={agent} className={blocCardClass("ops-agent-rail ops-card-interactive flex h-full min-h-[160px] flex-col !p-4")}>
            <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-[color:var(--text)]">{title}</h3>
                <button
                    type="button"
                    onClick={onOpen}
                    className="ops-focus-ring text-[12px] font-medium text-[color:var(--accent)] hover:underline"
                >
                    {openLabel}
                </button>
            </div>
            <div className="min-h-0 flex-1">{children}</div>
        </section>
    );
}

export function OverviewTab({ data, onOpenTab }: OverviewTabProps) {
    const decisions = data.project_state.summary.by_decision;
    const risks = data.risk_alerts.summary;

    return (
        <div className="ops-tab-fade space-y-3" data-agent="orchestrator">
            <div className="flex flex-wrap items-center gap-2">
                <AgentChip agentKey="orchestrator" status={data.agents_status.orchestrator} />
                <p className="text-[13px] text-[color:var(--text-muted)]">{AGENT_QUESTIONS.orchestrator}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <BentoCard title="État des projets" openLabel="Ouvrir →" onOpen={() => onOpenTab("projects")} agent="observer">
                    <div className="flex flex-wrap gap-2">
                        <StatusBadge variant="ok">
                            <span className="font-ops-data">{decisions.continue}</span> {labelDecision("Continue")}
                        </StatusBadge>
                        <StatusBadge variant="warning">
                            <span className="font-ops-data">{decisions.adjust}</span> {labelDecision("Adjust")}
                        </StatusBadge>
                        <StatusBadge variant="critical">
                            <span className="font-ops-data">{decisions.stop}</span> {labelDecision("Stop")}
                        </StatusBadge>
                        <StatusBadge variant="neutral">
                            <span className="font-ops-data">{decisions.unscored}</span> Non analysés
                        </StatusBadge>
                    </div>
                    <p className="mt-3 font-ops-data text-[12px] text-[color:var(--text-muted)]">
                        {data.project_state.summary.total} projets · viabilité moy.{" "}
                        {data.project_state.summary.avg_viability_score.toFixed(1)}/10
                    </p>
                </BentoCard>

                <BentoCard title="Risques détectés" openLabel="Ouvrir →" onOpen={() => onOpenTab("risks")} agent="watchdog">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-[10px] bg-[color:var(--surface-2)] px-2 py-2">
                            <p className="font-ops-display text-[20px] font-semibold tabular-nums text-[color:var(--critical)]">
                                {risks.critical}
                            </p>
                            <p className="text-ops-section mt-0.5 normal-case tracking-normal">Critiques</p>
                        </div>
                        <div className="rounded-[10px] bg-[color:var(--surface-2)] px-2 py-2">
                            <p className="font-ops-display text-[20px] font-semibold tabular-nums text-[color:var(--warn)]">
                                {risks.high}
                            </p>
                            <p className="text-ops-section mt-0.5 normal-case tracking-normal">Élevées</p>
                        </div>
                        <div className="rounded-[10px] bg-[color:var(--surface-2)] px-2 py-2">
                            <p className="font-ops-display text-[20px] font-semibold tabular-nums text-[color:var(--text)]">
                                {risks.medium}
                            </p>
                            <p className="text-ops-section mt-0.5 normal-case tracking-normal">Moyennes</p>
                        </div>
                    </div>
                    <p className="mt-3 font-ops-data text-[12px] text-[color:var(--text-muted)]">
                        {risks.total_open} alertes ouvertes · {risks.new_24h} nouvelles (24h)
                    </p>
                </BentoCard>

                <BentoCard title="Équipe" openLabel="Ouvrir →" onOpen={() => onOpenTab("talents")} agent="matchmaker">
                    <div className="space-y-2 text-[13px]">
                        <p>
                            <span className="font-ops-display text-[20px] font-semibold tabular-nums">{data.team.overloaded}</span>{" "}
                            <span className="text-[color:var(--text-muted)]">surchargés</span>
                        </p>
                        <p>
                            <span className="font-ops-display text-[20px] font-semibold tabular-nums">
                                {data.team.contract_ending_90d}
                            </span>{" "}
                            <span className="text-[color:var(--text-muted)]">contrats &lt; 90 j</span>
                        </p>
                        <p className="font-ops-data text-[12px] text-[color:var(--text-muted)]">
                            {data.team.total} collaborateurs suivis
                        </p>
                    </div>
                </BentoCard>

                <BentoCard title="Flux d'activité" openLabel="Ouvrir →" onOpen={() => onOpenTab("journal")} agent="observer">
                    <ActivityFeed decisions={data.project_state.recent_decisions} />
                </BentoCard>
            </div>
        </div>
    );
}
