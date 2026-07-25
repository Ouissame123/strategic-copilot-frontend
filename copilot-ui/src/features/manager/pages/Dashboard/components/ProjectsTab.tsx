import { useState } from "react";
import { Link } from "react-router";
import { HealthDot, ScoreBar } from "@/components/ui/ScoreBar";
import type {
    DashboardAgentsStatus,
    ProjectStateItem,
    ProjectStateSummary,
} from "@/features/manager/types/dashboard-v3";
import { managerProjectMissionControlPath } from "@/utils/workspace-routes";
import { blocCardClass } from "../dashboard-v3-ui";
import { AGENT_QUESTIONS, labelDecision, labelScoreDim } from "../lib/labels";
import { AgentChip } from "./AgentChip";
import { SideSheet } from "./SideSheet";
import { StatusBadge, decisionToBadgeVariant } from "./StatusBadge";
import { WhatIfPanel } from "./WhatIfPanel";

type ProjectsTabProps = {
    summary: ProjectStateSummary;
    projects: ProjectStateItem[];
    agentsStatus: DashboardAgentsStatus;
};

export function ProjectsTab({ summary, projects, agentsStatus }: ProjectsTabProps) {
    const [detail, setDetail] = useState<ProjectStateItem | null>(null);
    const [listOpen, setListOpen] = useState(false);
    const [whatIf, setWhatIf] = useState<ProjectStateItem | null>(null);

    return (
        <div className="ops-tab-fade space-y-3" data-agent="observer">
            <div className="flex flex-wrap items-center gap-2">
                <AgentChip agentKey="observer" status={agentsStatus.observer} />
                <p className="text-[13px] text-[color:var(--text-muted)]">{AGENT_QUESTIONS.observer}</p>
            </div>

            <section className={blocCardClass("ops-agent-rail !p-3")}>
                <div className="mb-3 flex flex-wrap gap-2">
                    {(
                        [
                            ["continue", summary.by_decision.continue],
                            ["adjust", summary.by_decision.adjust],
                            ["stop", summary.by_decision.stop],
                            ["unscored", summary.by_decision.unscored],
                        ] as const
                    ).map(([key, count]) => (
                        <StatusBadge key={key} variant={decisionToBadgeVariant(key === "unscored" ? null : key)}>
                            <span className="font-ops-data">{count}</span> {labelDecision(key === "unscored" ? "unscored" : key)}
                        </StatusBadge>
                    ))}
                </div>

                <div className="ops-scroll overflow-hidden rounded-[10px] border border-[color:var(--border)]">
                    <table className="w-full text-[13px]">
                        <thead className="bg-[color:var(--surface-2)]">
                            <tr className="text-left text-ops-section">
                                <th className="px-3 py-2 font-semibold">Projet</th>
                                <th className="px-3 py-2 font-semibold">Décision</th>
                                <th className="px-3 py-2 font-semibold">Score</th>
                                <th className="px-3 py-2 font-semibold">Santé</th>
                                <th className="px-3 py-2 text-right font-semibold">Alertes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.slice(0, 5).map((project) => (
                                <tr
                                    key={project.id}
                                    className="cursor-pointer border-t border-[color:var(--border)] hover:bg-[color:var(--surface-2)]"
                                    onClick={() => setDetail(project)}
                                >
                                    <td className="px-3 py-2 font-medium text-[color:var(--text)]">{project.name}</td>
                                    <td className="px-3 py-2">
                                        <StatusBadge variant={decisionToBadgeVariant(project.decision)}>
                                            {labelDecision(project.decision)}
                                        </StatusBadge>
                                    </td>
                                    <td className="px-3 py-2">
                                        <ScoreBar score={project.viability_score} />
                                    </td>
                                    <td className="px-3 py-2">
                                        <HealthDot score={project.health_score} />
                                    </td>
                                    <td className="px-3 py-2 text-right font-ops-data tabular-nums text-[color:var(--text-muted)]">
                                        {project.alerts.total}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {projects.length > 5 ? (
                    <button
                        type="button"
                        onClick={() => setListOpen(true)}
                        className="ops-focus-ring mt-3 text-[12px] font-medium text-[color:var(--accent)] hover:underline"
                    >
                        Voir les {projects.length} projets →
                    </button>
                ) : null}

                {projects.length === 0 ? <p className="text-[13px] text-[color:var(--text-muted)]">Aucun projet à afficher.</p> : null}
            </section>

            <SideSheet open={listOpen} onClose={() => setListOpen(false)} title="Tous les projets">
                <ul className="space-y-2">
                    {projects.map((project) => (
                        <li key={project.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    setListOpen(false);
                                    setDetail(project);
                                }}
                                className="ops-focus-ring flex w-full items-center justify-between rounded-[10px] border border-[color:var(--border)] px-3 py-2 text-left hover:border-[color:var(--border-strong)]"
                            >
                                <span className="text-[13px] font-medium">{project.name}</span>
                                <StatusBadge variant={decisionToBadgeVariant(project.decision)}>
                                    {labelDecision(project.decision)}
                                </StatusBadge>
                            </button>
                        </li>
                    ))}
                </ul>
            </SideSheet>

            <SideSheet open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.name ?? "Projet"}>
                {detail ? (
                    <div className="space-y-3 text-[13px]">
                        <StatusBadge variant={decisionToBadgeVariant(detail.decision)}>
                            {labelDecision(detail.decision)}
                        </StatusBadge>
                        <div className="flex flex-wrap items-center gap-3">
                            <ScoreBar score={detail.viability_score} />
                            <HealthDot score={detail.health_score} />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {(
                                [
                                    ["skills_fit", detail.scores.skills_fit],
                                    ["capacity", detail.scores.capacity],
                                    ["budget", detail.scores.budget],
                                    ["risk", detail.scores.risk],
                                ] as const
                            ).map(([key, value]) => (
                                <span
                                    key={key}
                                    className="font-ops-data rounded bg-[color:var(--surface-2)] px-2 py-0.5 text-[11px] tabular-nums text-[color:var(--text-muted)]"
                                >
                                    {labelScoreDim(key)} {value != null ? value.toFixed(1) : "—"}
                                </span>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            <Link
                                to={managerProjectMissionControlPath(detail.id)}
                                className="ops-focus-ring rounded-[10px] bg-[color:var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white hover:shadow-[0_0_16px_var(--accent-glow)]"
                            >
                                Voir la fiche
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    setWhatIf(detail);
                                    setDetail(null);
                                }}
                                className="ops-focus-ring rounded-[10px] border border-[color:var(--border)] px-3 py-1.5 text-[12px] font-medium text-[color:var(--text)] hover:border-[color:var(--border-strong)]"
                            >
                                Simuler
                            </button>
                        </div>
                    </div>
                ) : null}
            </SideSheet>

            {whatIf ? <WhatIfPanel project={whatIf} onClose={() => setWhatIf(null)} /> : null}
        </div>
    );
}
