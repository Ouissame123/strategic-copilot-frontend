import { useState } from "react";
import type {
    DashboardAgentsStatus,
    DashboardAnalystSection,
    DashboardMatchmakerSection,
    DashboardTeam,
} from "@/features/manager/types/dashboard-v3";
import { blocCardClass } from "../dashboard-v3-ui";
import { AGENT_QUESTIONS, labelMobility } from "../lib/labels";
import { AgentChip } from "./AgentChip";
import { StatusBadge } from "./StatusBadge";
import { TruncatedList } from "./TruncatedList";

type TalentsTabProps = {
    team: DashboardTeam;
    matchmaker: DashboardMatchmakerSection;
    analyst: DashboardAnalystSection;
    agentsStatus: DashboardAgentsStatus;
};

export function TalentsTab({ team, matchmaker, analyst, agentsStatus }: TalentsTabProps) {
    const [nineBoxOpen, setNineBoxOpen] = useState(false);

    return (
        <div className="ops-tab-fade space-y-3" data-agent="matchmaker">
            <div className="flex flex-wrap items-center gap-2">
                <AgentChip agentKey="matchmaker" status={agentsStatus.matchmaker} />
                <AgentChip agentKey="analyst" status={agentsStatus.analyst} />
                <p className="text-[13px] text-[color:var(--text-muted)]">{AGENT_QUESTIONS.matchmaker}</p>
            </div>

            <section className={blocCardClass("ops-agent-rail !p-3")}>
                <h3 className="mb-2 text-[13px] font-semibold text-[color:var(--text)]">Matching talents</h3>
                <div className="mb-3 flex flex-wrap gap-2 font-ops-data text-[12px] text-[color:var(--text-muted)]">
                    <span>{matchmaker.summary.projects_scored} projets scorés</span>
                    <span>· score moy. {matchmaker.summary.avg_match_score.toFixed(0)}%</span>
                    <span>· {matchmaker.summary.total_skill_gaps} écarts</span>
                    <span>· {matchmaker.summary.needs_recruitment} recrutements</span>
                </div>
                <TruncatedList
                    items={matchmaker.top_skill_gaps}
                    max={5}
                    sheetTitle="Écarts de compétences"
                    getKey={(g, i) => `${g.skill_name}-${i}`}
                    empty={<p className="text-sm text-ws-muted">Aucun écart prioritaire.</p>}
                    renderItem={(gap) => (
                        <div className="rounded-lg border border-[color:var(--ws-border)] px-3 py-2 text-sm">
                            <p className="font-medium text-ws-primary">{gap.skill_name}</p>
                            <p className="text-xs text-ws-muted">
                                {gap.projects_affected} projets · {gap.critical_count} critiques · écart moy.{" "}
                                {gap.avg_gap_size.toFixed(1)}
                            </p>
                        </div>
                    )}
                />
            </section>

            <section className={blocCardClass("!p-3")}>
                <h3 className="mb-2 text-sm font-semibold text-ws-primary">Équipe & analyste</h3>
                <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-ws-muted-surface px-2 py-2">
                        <p className="text-lg font-bold tabular-nums">{team.total}</p>
                        <p className="text-[10px] text-ws-muted">Total</p>
                    </div>
                    <div className="rounded-lg bg-ws-muted-surface px-2 py-2">
                        <p className="text-lg font-bold tabular-nums text-amber-600">{team.overloaded}</p>
                        <p className="text-[10px] text-ws-muted">Surchargés</p>
                    </div>
                    <div className="rounded-lg bg-ws-muted-surface px-2 py-2">
                        <p className="text-lg font-bold tabular-nums">{team.contract_ending_90d}</p>
                        <p className="text-[10px] text-ws-muted">Contrats &lt;90j</p>
                    </div>
                </div>

                <TruncatedList
                    items={analyst.at_risk_talents}
                    max={5}
                    sheetTitle="Talents à risque"
                    getKey={(t) => t.talent_id}
                    empty={<p className="text-sm text-ws-muted">Aucun talent à risque signalé.</p>}
                    renderItem={(talent) => (
                        <div className="rounded-lg border border-[color:var(--ws-border)] px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-ws-primary">{talent.talent_name}</p>
                                <StatusBadge variant={talent.mobility_flag === "at_risk" ? "critical" : "warning"}>
                                    {labelMobility(talent.mobility_flag)}
                                </StatusBadge>
                                {talent.has_watchdog_alert ? <StatusBadge variant="critical">Alerte</StatusBadge> : null}
                            </div>
                            <p className="mt-1 text-xs text-ws-muted">
                                Indice {talent.ipi_score != null ? talent.ipi_score.toFixed(1) : "—"}
                                {talent.box_label ? ` · ${talent.box_label}` : ""}
                            </p>
                        </div>
                    )}
                />
            </section>

            <section className={blocCardClass("!p-0")}>
                <button
                    type="button"
                    onClick={() => setNineBoxOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold text-ws-primary"
                >
                    Répartition nine-box
                    <span className="text-xs font-normal text-ws-muted">{nineBoxOpen ? "Replier" : "Déplier"}</span>
                </button>
                {nineBoxOpen ? (
                    <div className="border-t border-[color:var(--ws-border)] px-3 py-3">
                        {analyst.nine_box_distribution.length === 0 ? (
                            <p className="text-sm text-ws-muted">Répartition indisponible.</p>
                        ) : (
                            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {analyst.nine_box_distribution.map((cell) => (
                                    <li key={cell.box_label} className="rounded-lg bg-ws-muted-surface px-2 py-2 text-center">
                                        <p className="text-lg font-bold tabular-nums">{cell.count}</p>
                                        <p className="text-[10px] text-ws-muted">{cell.box_label}</p>
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
