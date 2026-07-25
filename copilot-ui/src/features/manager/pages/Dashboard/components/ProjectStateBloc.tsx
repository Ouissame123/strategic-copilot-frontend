import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/base/buttons/button";
import type {
    DashboardRecentDecision,
    ProjectStateItem,
    ProjectStateSummary,
} from "@/features/manager/types/dashboard-v3";
import { managerProjectMissionControlPath } from "@/utils/workspace-routes";
import { blocCardClass, decisionBadgeClass, viabilityToneClass } from "../dashboard-v3-ui";
import { WhatIfPanel } from "./WhatIfPanel";

type ProjectStateBlocProps = {
    summary: ProjectStateSummary;
    projects: ProjectStateItem[];
    recentDecisions: DashboardRecentDecision[];
};

function ScoreChip({ label, value }: { label: string; value: number | null }) {
    return (
        <span className="rounded bg-ws-muted-surface px-1.5 py-0.5 text-[10px] tabular-nums text-ws-muted">
            {label} {value != null ? value.toFixed(1) : "—"}
        </span>
    );
}

export function ProjectStateBloc({ summary, projects, recentDecisions }: ProjectStateBlocProps) {
    const { t } = useTranslation("common");
    const tb = (key: string, opts?: Record<string, string | number>) =>
        String(opts ? t(`managerWorkspace.dashboard.bloc1.${key}`, opts as never) : t(`managerWorkspace.dashboard.bloc1.${key}`));
    const [whatIfProject, setWhatIfProject] = useState<ProjectStateItem | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const visible = projects.slice(0, 8);
    const trendDelta = summary.viability_trend_7d.this_week - summary.viability_trend_7d.last_week;

    return (
        <section className={blocCardClass()} id="dashboard-observer">
            <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 className="text-base font-semibold text-ws-primary">{tb("title")}</h3>
                    <p className="mt-0.5 text-sm text-ws-muted">{tb("subtitle")}</p>
                </div>
                <div className="text-right text-xs text-ws-muted">
                    <p>
                        Santé moy. {summary.avg_health_score.toFixed(1)} · Viabilité {summary.avg_viability_score.toFixed(1)}/10
                    </p>
                    <p>
                        Tendance 7j : {trendDelta >= 0 ? "+" : ""}
                        {trendDelta.toFixed(1)}
                    </p>
                </div>
            </header>

            <div className="mb-3 flex flex-wrap gap-2">
                {(["continue", "adjust", "stop", "unscored"] as const).map((key) => (
                    <span
                        key={key}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${decisionBadgeClass(
                            key === "unscored" ? null : key.charAt(0).toUpperCase() + key.slice(1),
                        )}`}
                    >
                        {key}: {summary.by_decision[key]}
                    </span>
                ))}
            </div>
            <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-ws-muted">
                <span>Actifs {summary.by_status.active}</span>
                <span>· Planifiés {summary.by_status.planned}</span>
                <span>· Terminés {summary.by_status.completed}</span>
                <span>· Total {summary.total}</span>
            </div>

            {visible.length === 0 ? (
                <div className="py-6 text-center">
                    <p className="text-sm text-ws-muted">{tb("empty")}</p>
                    <Link to="/workspace/manager/projects" className="mt-2 inline-block text-xs text-[color:var(--ws-accent)] hover:underline">
                        Créer un projet
                    </Link>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-[color:var(--ws-border)] text-left text-[11px] font-semibold uppercase tracking-wide text-ws-muted">
                                <th className="py-2 pr-3">{tb("colProject")}</th>
                                <th className="py-2 pr-3">{tb("colScore")}</th>
                                <th className="py-2 pr-3">{tb("colDecision")}</th>
                                <th className="py-2 pr-3">{tb("colHealth")}</th>
                                <th className="py-2 pr-3">{tb("colLoad")}</th>
                                <th className="py-2 pr-3">{tb("colAlerts")}</th>
                                <th className="py-2">{tb("colActions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((project) => {
                                const open = expandedId === project.id;
                                return (
                                    <Fragment key={project.id}>
                                        <tr className="border-b border-[color:var(--ws-border)]/60 hover:bg-ws-muted-surface/40">
                                            <td className="py-2 pr-3 font-medium">
                                                <button
                                                    type="button"
                                                    className="mr-1 text-ws-muted"
                                                    aria-expanded={open}
                                                    onClick={() => setExpandedId(open ? null : project.id)}
                                                >
                                                    {open ? "▾" : "▸"}
                                                </button>
                                                <Link
                                                    to={managerProjectMissionControlPath(project.id)}
                                                    className="text-[color:var(--ws-accent)] hover:underline"
                                                >
                                                    {project.name}
                                                </Link>
                                            </td>
                                            <td className={`py-2 pr-3 tabular-nums font-semibold ${viabilityToneClass(project.viability_score)}`}>
                                                {project.viability_score != null ? project.viability_score.toFixed(1) : "—"}
                                            </td>
                                            <td className="py-2 pr-3">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${decisionBadgeClass(project.decision)}`}
                                                >
                                                    {project.decision ?? "—"}
                                                </span>
                                            </td>
                                            <td className="py-2 pr-3 tabular-nums">{project.health_score?.toFixed(1) ?? "—"}</td>
                                            <td className="py-2 pr-3 tabular-nums">
                                                {project.capacity_load_pct != null ? `${Math.round(project.capacity_load_pct)}%` : "—"}
                                            </td>
                                            <td className="py-2 pr-3 tabular-nums">
                                                {project.alerts.total}
                                                {project.alerts.critical > 0 ? (
                                                    <span className="ml-1 text-red-600">({project.alerts.critical})</span>
                                                ) : null}
                                            </td>
                                            <td className="py-2">
                                                <Button type="button" color="link-color" size="sm" onClick={() => setWhatIfProject(project)}>
                                                    {t("managerWorkspace.dashboard.whatIf.openBtn")}
                                                </Button>
                                            </td>
                                        </tr>
                                        {open ? (
                                            <tr className="border-b border-[color:var(--ws-border)]/40 bg-ws-muted-surface/30">
                                                <td colSpan={7} className="px-3 py-2">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <ScoreChip label="skills" value={project.scores.skills_fit} />
                                                        <ScoreChip label="capacity" value={project.scores.capacity} />
                                                        <ScoreChip label="budget" value={project.scores.budget} />
                                                        <ScoreChip label="risk" value={project.scores.risk} />
                                                        <ScoreChip label="conf." value={project.viability_confidence} />
                                                        <ScoreChip label="fragilité" value={project.fragility_score} />
                                                        <ScoreChip label="anxiété" value={project.anxiety_pulse} />
                                                        <span className="text-[10px] text-ws-muted">
                                                            équipe {project.team_size} · budget{" "}
                                                            {project.budget_consumed_pct != null
                                                                ? `${Math.round(project.budget_consumed_pct)}%`
                                                                : "—"}
                                                            {project.days_to_deadline != null ? ` · J${project.days_to_deadline}` : ""}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : null}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {projects.length > 8 ? (
                <Link to="/workspace/manager/projects" className="mt-3 inline-block text-xs text-[color:var(--ws-accent)] hover:underline">
                    Voir tous ({summary.total})
                </Link>
            ) : null}

            {recentDecisions.length > 0 ? (
                <div className="mt-4 border-t border-[color:var(--ws-border)] pt-3">
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ws-muted">Décisions récentes</h4>
                    <ul className="space-y-1.5">
                        {recentDecisions.slice(0, 5).map((d) => (
                            <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs">
                                <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${decisionBadgeClass(d.decision)}`}>
                                    {d.decision || "—"}
                                </span>
                                <Link
                                    to={managerProjectMissionControlPath(d.project_id)}
                                    className="font-medium text-[color:var(--ws-accent)] hover:underline"
                                >
                                    {d.project_name}
                                </Link>
                                {d.reason ? <span className="truncate text-ws-muted">{d.reason}</span> : null}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {whatIfProject ? <WhatIfPanel project={whatIfProject} onClose={() => setWhatIfProject(null)} /> : null}
        </section>
    );
}
