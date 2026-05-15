import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { agentsApi } from "@/api/agents.api";
import { buildStrictAssignTalentPayload } from "@/api/manager-projects.api";
import { orchestratorApi } from "@/api/orchestrator.api";
import { strategistApi } from "@/api/strategist.api";
import { ManagerProjectCopilotPanel, type CopilotPrefetchedProjectContext } from "@/components/copilot/ManagerProjectCopilotPanel";
import { formatUserFacingExplanation } from "@/lib/business-explanation";
import { readMissionControlHttpErrorMessage, readUserFacingApiErrorMessage } from "@/lib/user-facing-api-error";
import { WhatIfResultsPanel } from "@/components/project/what-if-results-panel";
import { useDecisionLog } from "@/hooks/useNotifications";
import { useTeam } from "@/hooks/useTeam";
import {
    useAssignTalent,
    useProjectDetail,
    useUnassignTalent,
    useUpdateProject,
    useWhatIf,
} from "@/hooks/useProjects";
import type { AssignTalentRequest, AssignmentItem, ProjectListItem, ProjectStatus, WmpAssignmentType } from "@/types/api.types";
import { useToast } from "@/providers/toast-provider";
import { cx } from "@/utils/cx";

export type ProjectMissionControlModalProps = {
    open: boolean;
    projectId: string | null;
    listProject: ProjectListItem | undefined;
    onClose: () => void;
};

type WorkspaceTabId = "overview" | "team" | "risks" | "simulation" | "decisions";
type MobileMissionTabId = WorkspaceTabId | "copilot";

function clamp(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
}

/** Valeur `YYYY-MM-DD` pour `<input type="date" />` depuis une date ISO renvoyée par l’API. */
function toDateInputValue(iso: string | null | undefined): string {
    const s = String(iso ?? "").trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const t = Date.parse(s);
    if (Number.isNaN(t)) return "";
    return new Date(t).toISOString().slice(0, 10);
}

/** Normalise le statut API (casse / espaces) vers une valeur `<select>` du type `ProjectStatus`. */
function statusForSelect(raw: string | null | undefined): ProjectStatus {
    const v = String(raw ?? "active")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
    if (v === "on_hold" || v === "onhold") return "on_hold";
    if (v === "planned" || v === "active" || v === "completed" || v === "cancelled") return v;
    return "active";
}

function normalizeId(value: unknown): string {
    return String(value ?? "").trim().toLowerCase();
}

function looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function pickTalentDisplayName(
    params: {
        talentName?: string;
        mappedName?: string;
        talentEmail?: string;
        talentId?: string;
    },
    unknownTalent: string,
): string {
    const talentName = String(params.talentName ?? "").trim();
    const mappedName = String(params.mappedName ?? "").trim();
    const talentEmail = String(params.talentEmail ?? "").trim();
    const talentId = String(params.talentId ?? "").trim();
    if (talentName && !looksLikeUuid(talentName)) return talentName;
    if (mappedName) return mappedName;
    if (talentEmail) return talentEmail;
    if (talentId) return talentId;
    return unknownTalent;
}

function formatAllocation(value: number | string): string {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return "—";
    return `${n}%`;
}

/** Radar synthétique (viabilité, santé, marge charge, calme alertes) — dérivé des KPI déjà chargés. */
function MissionRadar({
    viability,
    health,
    loadPct,
    alertCount,
}: {
    viability: number | null;
    health: number | null;
    loadPct: number | null;
    alertCount: number;
}) {
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);
    const axes = useMemo(() => {
        const v = viability != null ? clamp(viability, 0, 10) / 10 : 0.5;
        const h = health != null ? clamp(health, 0, 10) / 10 : 0.5;
        const l = loadPct != null ? clamp(1 - loadPct / 100, 0, 1) : 0.5;
        const a = clamp(1 - Math.min(alertCount, 8) / 8, 0, 1);
        return [
            { label: tm("axisViability"), t: v },
            { label: tm("axisHealth"), t: h },
            { label: tm("axisLoadMargin"), t: l },
            { label: tm("axisCalmAlerts"), t: a },
        ];
    }, [viability, health, loadPct, alertCount, t]);

    const n = axes.length;
    const cx0 = 50;
    const cy0 = 50;
    const r = 36;
    const outerPts = axes
        .map((_, i) => {
            const ang = (-Math.PI / 2 + (2 * Math.PI * i) / n) as number;
            return `${cx0 + r * Math.cos(ang)},${cy0 + r * Math.sin(ang)}`;
        })
        .join(" ");
    const pts = axes.map((ax, i) => {
        const ang = (-Math.PI / 2 + (2 * Math.PI * i) / n) as number;
        const rr = r * (0.2 + 0.8 * ax.t);
        return { x: cx0 + rr * Math.cos(ang), y: cy0 + rr * Math.sin(ang) };
    });
    const d = pts.map((p) => `${p.x},${p.y}`).join(" ");

    return (
        <section className="rounded-xl border border-secondary bg-primary p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-tertiary">{tm("radarTitle")}</h4>
            <div className="flex justify-center">
                <svg viewBox="0 0 100 100" className="h-36 w-full max-w-[200px]" aria-hidden>
                    <polygon points={outerPts} fill="currentColor" className="text-secondary_subtle/40" stroke="currentColor" strokeWidth={0.5} />
                    <polygon points={d} fill="currentColor" className="text-brand-secondary/25" stroke="currentColor" strokeWidth={1} />
                </svg>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-fg-tertiary">
                {axes.map((ax) => (
                    <li key={ax.label} className="flex justify-between gap-1 rounded bg-secondary_subtle/50 px-1.5 py-0.5">
                        <span>{ax.label}</span>
                        <span className="tabular-nums text-fg-secondary">{Math.round(ax.t * 100)}%</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** Matrice risque approximative : retard vs densité d’alertes. */
function RiskMatrix({ delayDays, alertCount }: { delayDays: number | null; alertCount: number }) {
    const { t } = useTranslation("common");
    const tm = (key: string, opts?: Record<string, string | number>) => {
        const k = `managerWorkspace.missionControl.${key}`;
        return String(opts ? t(k, opts as never) : t(k));
    };
    const dx = delayDays != null ? clamp(delayDays / 30, 0, 1) : 0.35;
    const dy = clamp(alertCount / 8, 0, 1);
    const left = dx * 100;
    const top = (1 - dy) * 100;

    return (
        <section className="rounded-xl border border-secondary bg-primary p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-tertiary">{tm("matrixTitle")}</h4>
            <p className="mb-2 text-[10px] text-fg-tertiary">{tm("matrixHint")}</p>
            <div className="relative aspect-square w-full max-w-[200px] rounded-lg border border-dashed border-secondary bg-gradient-to-br from-emerald-500/5 via-amber-500/10 to-red-500/15">
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 text-[9px] text-fg-tertiary/80">
                    <span className="p-1">{tm("matrixLowSlow")}</span>
                    <span className="p-1 text-right">{tm("matrixHighSlow")}</span>
                    <span className="p-1 self-end">{tm("matrixLowFast")}</span>
                    <span className="p-1 self-end text-right">{tm("matrixHighFast")}</span>
                </div>
                <div
                    className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-brand-solid shadow-md"
                    style={{ left: `${left}%`, top: `${top}%` }}
                    title={tm("matrixDotTitle", { days: delayDays ?? "—", count: alertCount })}
                />
            </div>
        </section>
    );
}

function TeamHeatmap({
    assignments,
    teamNameById,
}: {
    assignments: AssignmentItem[];
    teamNameById: Map<string, string | undefined>;
}) {
    const { t } = useTranslation("common");
    const unknownTalent = t("managerWorkspace.missionControl.unknownTalent");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);
    return (
        <section className="rounded-xl border border-secondary bg-primary p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-tertiary">{tm("heatmapTitle")}</h4>
            <div className="space-y-2">
                {assignments.length === 0 ? <p className="text-xs text-fg-tertiary">{tm("heatmapEmpty")}</p> : null}
                {assignments.map((a, idx) => {
                    const id = String(a.talent_id ?? "").trim();
                    const key = normalizeId(a.talent_id);
                    const rowKey = String(a.id ?? "").trim() || `${id || "talent"}-${idx}`;
                    const pct = typeof a.allocation_pct === "number" ? a.allocation_pct : Number(a.allocation_pct);
                    const w = Number.isFinite(pct) ? clamp(pct, 0, 100) : 0;
                    const label = pickTalentDisplayName(
                        {
                            talentName: a.talent_name,
                            mappedName: teamNameById.get(key),
                            talentEmail: a.talent_email,
                            talentId: id,
                        },
                        unknownTalent,
                    );
                    return (
                        <div key={rowKey} className="space-y-0.5">
                            <div className="flex justify-between gap-1 text-[11px] text-fg-secondary">
                                <span className="truncate font-medium text-fg-primary">{label}</span>
                                <span className="shrink-0 tabular-nums">{formatAllocation(a.allocation_pct)}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-secondary_subtle">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-brand-secondary to-brand-solid"
                                    style={{ width: `${w}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export function ProjectMissionControlModal({ open, projectId, listProject, onClose }: ProjectMissionControlModalProps) {
    const enabled = open && Boolean(projectId);
    const pid = projectId ?? "";

    const detail = useProjectDetail(pid);
    const decisionLog = useDecisionLog({ project_id: pid || undefined, limit: 10, enabled: enabled && Boolean(pid) });
    const teamQuery = useTeam({ scope: "enterprise", limit: 500 });
    const teamNameById = useMemo(
        () =>
            new Map(
                (teamQuery.data?.talents ?? [])
                    .map((talent) => {
                        const id = normalizeId(talent.id);
                        return [id, talent.full_name] as const;
                    })
                    .filter(([id]) => id.length > 0),
            ),
        [teamQuery.data?.talents],
    );

    const updateProject = useUpdateProject();
    const assignTalent = useAssignTalent();
    const unassignTalent = useUnassignTalent();
    const whatIf = useWhatIf();
    const [editPayload, setEditPayload] = useState({ status: "active" as ProjectStatus, priority: 5, milestone_at: "" });
    const { push: pushToast } = useToast();
    const assignmentTypeTouched = useRef(false);
    const [assignPayload, setAssignPayload] = useState<{
        talent_id: string;
        allocation_pct: number;
        assignment_type: WmpAssignmentType;
    }>({ talent_id: "", allocation_pct: 50, assignment_type: "part_time" });
    const [whatIfPayload, setWhatIfPayload] = useState({ added_talent_id: "", allocation_pct: "" });
    const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTabId>("overview");
    const [mobileMissionTab, setMobileMissionTab] = useState<MobileMissionTabId>("overview");

    const { t, i18n } = useTranslation("common");
    const tm = useCallback(
        (key: string, opts?: Record<string, string | number>) => {
            const k = `managerWorkspace.missionControl.${key}`;
            return String(opts ? t(k, opts as never) : t(k));
        },
        [t],
    );

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (open) {
            setMobileMissionTab("overview");
            setWorkspaceTab("overview");
        }
    }, [open, projectId]);

    useEffect(() => {
        if (!open || !projectId) return;
        const project = detail.data?.project;
        const rowMatches =
            listProject &&
            (String(listProject.id).trim() === String(projectId).trim() ||
                normalizeId(listProject.id) === normalizeId(projectId));
        const row = rowMatches ? listProject : undefined;
        const src = project ?? row;
        if (!src) return;
        setEditPayload({
            status: statusForSelect(src.status),
            priority: clamp(Number(src.priority ?? 5) || 5, 1, 10),
            milestone_at: toDateInputValue(src.milestone_at != null ? String(src.milestone_at) : ""),
        });
    }, [
        open,
        projectId,
        detail.data?.project?.status,
        detail.data?.project?.priority,
        detail.data?.project?.milestone_at,
        listProject?.id,
        listProject?.status,
        listProject?.priority,
        listProject?.milestone_at,
    ]);

    useEffect(() => {
        assignmentTypeTouched.current = false;
        setAssignPayload({ talent_id: "", allocation_pct: 50, assignment_type: "part_time" });
    }, [open, projectId]);

    const editBaseline = useMemo(() => {
        if (!open || !projectId) return null;
        const project = detail.data?.project;
        const rowMatches =
            listProject &&
            (String(listProject.id).trim() === String(projectId).trim() ||
                normalizeId(listProject.id) === normalizeId(projectId));
        const src = project ?? (rowMatches ? listProject : undefined);
        if (!src) return null;
        return {
            status: statusForSelect(src.status),
            priority: clamp(Number(src.priority ?? 5) || 5, 1, 10),
            milestone_at: toDateInputValue(src.milestone_at != null ? String(src.milestone_at) : ""),
        };
    }, [
        open,
        projectId,
        detail.data?.project?.status,
        detail.data?.project?.priority,
        detail.data?.project?.milestone_at,
        listProject?.id,
        listProject?.status,
        listProject?.priority,
        listProject?.milestone_at,
    ]);

    const isEditDirty =
        editBaseline != null &&
        (editPayload.status !== editBaseline.status ||
            editPayload.priority !== editBaseline.priority ||
            editPayload.milestone_at !== editBaseline.milestone_at);

    const analyzeFull = useMutation({
        mutationFn: (project_id: string) => orchestratorApi.computeViability({ project_id, force_refresh: true }).then((res) => res.data),
    });
    const loadObserverKpi = useMutation({
        mutationFn: (project_id: string) => agentsApi.projectAnalysis({ project_id }).then((res) => res.data),
    });
    const loadRisk = useMutation({
        mutationFn: (project_id: string) => agentsApi.riskKpi({ project_id, use_ai: true }).then((res) => res.data),
    });
    const loadTalents = useMutation({
        mutationFn: (project_id: string) => agentsApi.talentMatching({ project_id, use_ai: true, top_n: 5 }).then((res) => res.data),
    });
    const strategistExecute = useMutation({
        mutationFn: (option_id: string) => strategistApi.execute({ option_id, action: "execute" }).then((res) => res.data),
    });
    const strategistReject = useMutation({
        mutationFn: (option_id: string) => strategistApi.execute({ option_id, action: "reject" }).then((res) => res.data),
    });

    const viabilityScore = detail.data?.latest_viability?.score ?? listProject?.latest_viability_score ?? null;
    const health = detail.data?.latest_kpi?.project_health_score ?? null;
    const loadPct = detail.data?.latest_kpi?.capacity_load_pct ?? null;
    const delayDays = detail.data?.latest_kpi?.delay_days ?? null;
    const alertCount = detail.data?.active_alerts?.length ?? 0;
    const projectName = detail.data?.project.name ?? listProject?.name ?? tm("projectNameFallback");
    const decisionBadge = detail.data?.latest_viability?.decision ?? listProject?.latest_decision ?? "—";
    const scoreBadge = detail.data?.latest_viability?.score ?? listProject?.latest_viability_score;

    const copilotPrefetched: CopilotPrefetchedProjectContext = useMemo(() => {
        const recommendation = formatUserFacingExplanation(detail.data?.latest_viability?.explanation, {
            score: detail.data?.latest_viability?.score ?? viabilityScore,
            decision: detail.data?.latest_viability?.decision ?? listProject?.latest_decision ?? null,
        });
        return {
            displayName: projectName,
            decision: decisionBadge,
            score: scoreBadge ?? "—",
            alertsCount: detail.data?.active_alerts?.length ?? 0,
            aiRecommendation: recommendation,
        };
    }, [projectName, decisionBadge, scoreBadge, detail.data?.latest_viability, detail.data?.active_alerts, listProject, viabilityScore]);

    if (!open || !projectId) return null;

    const leftPanel = (
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto p-2">
            <MissionRadar viability={viabilityScore} health={health} loadPct={loadPct} alertCount={alertCount} />
            <RiskMatrix delayDays={delayDays} alertCount={alertCount} />
            <TeamHeatmap assignments={detail.data?.assignments ?? []} teamNameById={teamNameById} />
        </div>
    );

    const mobileChip = (id: MobileMissionTabId, label: string) => (
        <button
            type="button"
            key={id}
            onClick={() => setMobileMissionTab(id)}
            className={cx(
                "shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs",
                mobileMissionTab === id ? "bg-brand-solid text-white" : "text-fg-secondary hover:bg-secondary_subtle",
            )}
        >
            {label}
        </button>
    );

    const dateLocale = i18n.language === "ar" ? "ar" : i18n.language === "en" ? "en-GB" : "fr-FR";
    const milestoneLabel = (detail.data?.project.milestone_at ?? listProject?.milestone_at)
        ? new Date((detail.data?.project.milestone_at ?? listProject?.milestone_at) as string).toLocaleDateString(dateLocale, {
              day: "numeric",
              month: "short",
              year: "numeric",
          })
        : "—";
    const statusBadge = detail.data?.project.status ?? listProject?.status ?? "—";
    const priorityBadge = detail.data?.project.priority ?? listProject?.priority ?? "—";

    const copilotColumn = (
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-secondary/50 lg:border-l">
            <div className="min-h-0 flex-1 overflow-hidden p-2">
                <ManagerProjectCopilotPanel
                    projectId={pid}
                    projectName={projectName}
                    compact
                    prefetchedContext={copilotPrefetched}
                />
            </div>
        </div>
    );

    const workspaceNav = (
        <nav
            className="hidden shrink-0 flex-wrap gap-1 border-b border-secondary bg-secondary_subtle/50 px-2 py-1.5 lg:flex"
            aria-label={tm("navWorkspaceAria")}
        >
            {(
                [
                    { id: "overview" as const, labelKey: "tabOverview" as const },
                    { id: "team" as const, labelKey: "tabTeam" as const },
                    { id: "risks" as const, labelKey: "tabRisks" as const },
                    { id: "simulation" as const, labelKey: "tabSimulation" as const },
                    { id: "decisions" as const, labelKey: "tabDecisions" as const },
                ] as const
            ).map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => setWorkspaceTab(tab.id)}
                    className={cx(
                        "rounded-lg px-3 py-2 text-xs font-semibold transition",
                        workspaceTab === tab.id ? "bg-brand-solid text-white" : "text-fg-secondary hover:bg-secondary_subtle",
                    )}
                >
                    {tm(tab.labelKey)}
                </button>
            ))}
        </nav>
    );

    const overviewBody = (
        <div className="space-y-4">
            <div className="space-y-2 lg:hidden">
                <MissionRadar viability={viabilityScore} health={health} loadPct={loadPct} alertCount={alertCount} />
                <RiskMatrix delayDays={delayDays} alertCount={alertCount} />
                <TeamHeatmap assignments={detail.data?.assignments ?? []} teamNameById={teamNameById} />
            </div>
            {detail.isLoading ? <p className="text-sm text-fg-secondary">{tm("loadingShort")}</p> : null}
            {detail.isError ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                    {tm("partialDetailNote")}
                </p>
            ) : null}
            <section className="rounded-xl border border-secondary bg-primary p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">{tm("execSummary")}</p>
                <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
                    {formatUserFacingExplanation(detail.data?.latest_viability?.explanation, {
                        score: detail.data?.latest_viability?.score ?? viabilityScore,
                        decision: detail.data?.latest_viability?.decision ?? listProject?.latest_decision ?? null,
                    })}
                </p>
            </section>
            <section className="grid gap-2 sm:grid-cols-2">
                <article className="rounded-xl border border-secondary p-3">
                    <p className="text-xs text-fg-tertiary">{tm("healthKpi")}</p>
                    <p className="text-lg font-semibold text-fg-primary">{detail.data?.latest_kpi?.project_health_score ?? "—"}</p>
                </article>
                <article className="rounded-xl border border-secondary p-3">
                    <p className="text-xs text-fg-tertiary">{tm("viabilityKpi")}</p>
                    <p className="text-lg font-semibold text-fg-primary">{detail.data?.latest_viability?.score ?? listProject?.latest_viability_score ?? "—"}</p>
                </article>
                <article className="rounded-xl border border-secondary p-3">
                    <p className="text-xs text-fg-tertiary">{tm("alertsKpi")}</p>
                    <p className="text-lg font-semibold text-fg-primary">{detail.data?.active_alerts?.length ?? 0}</p>
                </article>
                <article className="rounded-xl border border-secondary p-3">
                    <p className="text-xs text-fg-tertiary">{tm("assignedTalentsKpi")}</p>
                    <p className="text-lg font-semibold text-fg-primary">{detail.data?.assignments?.length ?? 0}</p>
                </article>
                <article className="rounded-xl border border-secondary p-3">
                    <p className="text-xs text-fg-tertiary">{tm("progressKpi")}</p>
                    <p className="text-lg font-semibold text-fg-primary">
                        {detail.data?.latest_kpi?.progress_pct != null && Number.isFinite(detail.data.latest_kpi.progress_pct)
                            ? `${detail.data.latest_kpi.progress_pct}%`
                            : "—"}
                    </p>
                </article>
            </section>
            <section className="rounded-xl border border-brand-secondary/25 bg-brand-primary/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">{tm("aiRecoTitle")}</p>
                <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{tm("aiRecoBody", { milestone: milestoneLabel })}</p>
            </section>
        </div>
    );

    const teamBody = (
        <div className="space-y-4">
            <section className="rounded-xl border border-secondary p-4">
                <h4 className="mb-2 font-medium text-fg-primary">{tm("projectStatusTitle")}</h4>
                <div className="grid gap-3 md:grid-cols-3">
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-fg-tertiary">{tm("labelProjectStatus")}</span>
                        <select
                            value={editPayload.status}
                            onChange={(e) => setEditPayload((p) => ({ ...p, status: e.target.value as ProjectStatus }))}
                            className="rounded border border-secondary bg-primary px-2 py-1.5 text-sm text-fg-primary"
                        >
                            <option value="planned">{tm("statusOptionPlanned")}</option>
                            <option value="active">{tm("statusOptionActive")}</option>
                            <option value="on_hold">{tm("statusOptionOnHold")}</option>
                            <option value="completed">{tm("statusOptionCompleted")}</option>
                            <option value="cancelled">{tm("statusOptionCancelled")}</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-fg-tertiary">{tm("labelProjectPriority")}</span>
                        <input
                            value={editPayload.priority}
                            type="number"
                            min={1}
                            max={10}
                            placeholder={tm("priorityPlaceholder")}
                            onChange={(e) => setEditPayload((p) => ({ ...p, priority: clamp(Number(e.target.value) || 1, 1, 10) }))}
                            className="rounded border border-secondary bg-primary px-2 py-1.5 text-sm text-fg-primary"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-fg-tertiary">{tm("labelProjectMilestone")}</span>
                        <input
                            value={editPayload.milestone_at}
                            type="date"
                            onChange={(e) => setEditPayload((p) => ({ ...p, milestone_at: e.target.value }))}
                            className="rounded border border-secondary bg-primary px-2 py-1.5 text-sm text-fg-primary"
                        />
                    </label>
                </div>
                <p className="mt-2 text-xs text-fg-tertiary">{tm("priorityHint")}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        disabled={updateProject.isPending || !isEditDirty}
                        className="rounded border border-secondary bg-primary px-3 py-2 text-sm font-medium text-fg-secondary hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => {
                            if (updateProject.isPending || !isEditDirty) return;
                            updateProject.mutate({
                                projectId: pid,
                                body: {
                                    status: editPayload.status,
                                    priority: editPayload.priority,
                                    milestone_at: editPayload.milestone_at.trim() ? editPayload.milestone_at.trim() : null,
                                },
                            });
                        }}
                    >
                        {tm("saveProjectChanges")}
                    </button>
                </div>
            </section>

            <section className="rounded-xl border border-secondary p-4">
                <h4 className="mb-3 font-medium text-fg-primary">{tm("teamDeployedTitle")}</h4>
                {(detail.data?.assignments ?? []).length === 0 ? (
                    <p className="text-sm text-fg-tertiary">{tm("noAssignmentsOnProject")}</p>
                ) : (
                    <div className="space-y-2">
                        {(detail.data?.assignments ?? []).map((a, idx) => {
                            const assignmentTalentId = String(a.talent_id ?? "").trim();
                            const assignmentTalentKey = normalizeId(a.talent_id);
                            const displayName = pickTalentDisplayName(
                                {
                                    talentName: a.talent_name,
                                    mappedName: teamNameById.get(assignmentTalentKey),
                                    talentEmail: a.talent_email,
                                    talentId: assignmentTalentId,
                                },
                                tm("unknownTalent"),
                            );
                            const email = String(a.talent_email ?? "").trim();
                            return (
                                <div
                                    key={assignmentTalentId || `assignment-${idx}`}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-secondary px-3 py-2"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-fg-primary">{displayName}</p>
                                        {email ? <p className="truncate text-xs text-fg-tertiary">{email}</p> : null}
                                        <p className="text-xs text-fg-tertiary">
                                            {tm("allocationPrefix")} {formatAllocation(a.allocation_pct)}
                                            {a.role_on_project ? ` · ${a.role_on_project}` : ""}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="shrink-0 rounded border border-secondary bg-primary px-2 py-1 text-xs font-medium text-fg-secondary hover:bg-secondary_subtle"
                                        onClick={() =>
                                            assignmentTalentId &&
                                            unassignTalent.mutate(
                                                { projectId: pid, talentId: assignmentTalentId },
                                                {
                                                    onSuccess: async () => {
                                                        pushToast(tm("unassignSuccessToast"), "success");
                                                    },
                                                    onError: (err) => {
                                                        pushToast(
                                                            tm("unassignTalentError", { message: readMissionControlHttpErrorMessage(err) }),
                                                            "error",
                                                        );
                                                    },
                                                },
                                            )
                                        }
                                        disabled={!assignmentTalentId || unassignTalent.isPending}
                                    >
                                        {tm("unassign")}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-4 space-y-3 border-t border-secondary pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">{tm("teamSectionTitle")}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex flex-col gap-1 md:col-span-2">
                            <span className="text-xs font-medium text-fg-tertiary">{tm("pickTalent")}</span>
                            <select
                                value={assignPayload.talent_id}
                                onChange={(e) => setAssignPayload((p) => ({ ...p, talent_id: e.target.value }))}
                                className="w-full rounded border border-secondary bg-primary px-2 py-1.5 text-sm text-fg-primary"
                            >
                                <option value="">{tm("pickTalent")}</option>
                                {(teamQuery.data?.talents ?? []).map((talent, idx) => {
                                    const talentId = String(talent.id ?? "").trim();
                                    if (!talentId) return null;
                                    return (
                                        <option key={talentId || `talent-option-${idx}`} value={talentId}>
                                            {talent.full_name}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-fg-tertiary">{tm("labelAllocationPercent")}</span>
                            <input
                                value={assignPayload.allocation_pct}
                                type="number"
                                min={0}
                                max={100}
                                onChange={(e) => {
                                    const n = clamp(Number(e.target.value) || 0, 0, 100);
                                    setAssignPayload((p) => ({
                                        ...p,
                                        allocation_pct: n,
                                        ...(!assignmentTypeTouched.current
                                            ? { assignment_type: n >= 80 ? "full_time" : "part_time" }
                                            : {}),
                                    }));
                                }}
                                className="rounded border border-secondary bg-primary px-2 py-1.5 text-sm text-fg-primary"
                            />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-fg-tertiary">{tm("labelAssignmentType")}</span>
                            <select
                                value={assignPayload.assignment_type}
                                onChange={(e) => {
                                    assignmentTypeTouched.current = true;
                                    setAssignPayload((p) => ({
                                        ...p,
                                        assignment_type: e.target.value as WmpAssignmentType,
                                    }));
                                }}
                                className="rounded border border-secondary bg-primary px-2 py-1.5 text-sm text-fg-primary"
                            >
                                <option value="full_time">{tm("assignTypeFullTime")}</option>
                                <option value="part_time">{tm("assignTypePartTime")}</option>
                                <option value="backup">{tm("assignTypeBackup")}</option>
                                <option value="temporary">{tm("assignTypeTemporary")}</option>
                            </select>
                        </label>
                    </div>
                    <button
                        type="button"
                        disabled={
                            assignTalent.isPending ||
                            !String(assignPayload.talent_id).trim() ||
                            !Number.isFinite(assignPayload.allocation_pct)
                        }
                        className="rounded border border-secondary bg-primary px-3 py-2 text-sm font-medium text-fg-secondary hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => {
                            const alloc = clamp(Number(assignPayload.allocation_pct) || 0, 0, 100);
                            const assignment_type: WmpAssignmentType =
                                assignPayload.assignment_type || (alloc >= 80 ? "full_time" : "part_time");
                            let body: AssignTalentRequest;
                            try {
                                body = buildStrictAssignTalentPayload({
                                    talent_id: String(assignPayload.talent_id).trim(),
                                    allocation_pct: alloc,
                                    assignment_type,
                                    start_date: null,
                                    end_date: null,
                                    role_on_project: null,
                                });
                            } catch {
                                pushToast(tm("assignTalentError", { message: "Données invalides" }), "error");
                                return;
                            }
                            assignTalent.mutate(
                                { projectId: pid, body },
                                {
                                    onSuccess: async () => {
                                        pushToast(tm("assignSuccessToast"), "success");
                                        assignmentTypeTouched.current = false;
                                        setAssignPayload({ talent_id: "", allocation_pct: 50, assignment_type: "part_time" });
                                    },
                                    onError: (err) => {
                                        pushToast(tm("assignTalentError", { message: readMissionControlHttpErrorMessage(err) }), "error");
                                    },
                                },
                            );
                        }}
                    >
                        {tm("assign")}
                    </button>
                </div>
            </section>
        </div>
    );

    const risksBody = (
        <section className="rounded-xl border border-secondary p-4">
            <h4 className="mb-2 font-medium text-fg-primary">{tm("activeAlertsTitle")}</h4>
            {(detail.data?.active_alerts ?? []).map((a) => (
                <div key={a.id} className="mb-2 rounded-lg border border-secondary px-3 py-2">
                    <p className="text-sm text-fg-primary">{a.title}</p>
                    <p className="text-xs uppercase text-fg-tertiary">{a.severity}</p>
                </div>
            ))}
            {!(detail.data?.active_alerts?.length ?? 0) ? <p className="text-sm text-fg-tertiary">{tm("noOpenAlerts")}</p> : null}
        </section>
    );

    const simulationBody = (
        <div className="space-y-4">
            <section className="rounded-xl border border-secondary p-4">
                <h4 className="mb-2 font-medium text-fg-primary">{tm("whatIfTitle")}</h4>
                <p className="mb-3 text-xs text-fg-tertiary">{tm("whatIfIntro")}</p>
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                        <span className="text-xs text-fg-tertiary">{tm("talentToAdd")}</span>
                        <select
                            value={whatIfPayload.added_talent_id}
                            onChange={(e) => setWhatIfPayload((p) => ({ ...p, added_talent_id: e.target.value }))}
                            className="w-full rounded border border-secondary bg-primary px-2 py-1 text-sm text-fg-primary"
                        >
                            <option value="">{tm("noTalentAdd")}</option>
                            {(teamQuery.data?.talents ?? []).map((talent, idx) => {
                                const talentId = String(talent.id ?? "").trim();
                                if (!talentId) return null;
                                return (
                                    <option key={talentId || `talent-whatif-${idx}`} value={talentId}>
                                        {talent.full_name}
                                    </option>
                                );
                            })}
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs text-fg-tertiary">{tm("extraAllocPct")}</span>
                        <input
                            value={whatIfPayload.allocation_pct}
                            onChange={(e) => setWhatIfPayload((p) => ({ ...p, allocation_pct: e.target.value }))}
                            type="number"
                            min={0}
                            max={100}
                            placeholder={tm("placeholderAllocExample")}
                            className="w-full rounded border border-secondary bg-primary px-2 py-1 text-sm text-fg-primary"
                        />
                    </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="rounded border border-secondary bg-primary px-2 py-1 text-xs font-medium text-fg-secondary hover:bg-secondary_subtle"
                        onClick={() => setWhatIfPayload((p) => ({ ...p, allocation_pct: "20" }))}
                    >
                        {tm("whatIfAdd20")}
                    </button>
                    <button
                        type="button"
                        className="rounded border border-secondary bg-primary px-2 py-1 text-xs font-medium text-fg-secondary hover:bg-secondary_subtle"
                        onClick={() => setWhatIfPayload({ added_talent_id: "", allocation_pct: "" })}
                    >
                        {tm("reset")}
                    </button>
                    <button
                        type="button"
                        className="rounded border border-secondary bg-primary px-3 py-1 text-sm font-medium text-fg-secondary hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={whatIf.isPending}
                        onClick={() => {
                            whatIf.mutate({
                                projectId: pid,
                                modifications: {
                                    allocation_pct: Number(whatIfPayload.allocation_pct) || 0,
                                    added_talent_id: whatIfPayload.added_talent_id || null,
                                },
                            });
                        }}
                    >
                        {whatIf.isPending ? tm("simulateRunning") : tm("runSimulation")}
                    </button>
                </div>
                {whatIf.data ? <WhatIfResultsPanel data={whatIf.data} /> : null}
                {whatIf.isError ? (
                    <p className="mt-2 text-sm text-utility-error-600">{readUserFacingApiErrorMessage(whatIf.error, tm("simulationFailedHelp"))}</p>
                ) : null}
            </section>
            <section className="rounded-xl border border-secondary p-4">
                <h4 className="mb-2 font-medium text-fg-primary">{tm("observerTitle")}</h4>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="rounded border border-secondary bg-primary px-3 py-1 text-sm font-medium text-fg-secondary hover:bg-secondary_subtle"
                        onClick={() => analyzeFull.mutate(pid)}
                    >
                        {tm("fullAnalysis")}
                    </button>
                    <button
                        type="button"
                        className="rounded border border-secondary bg-primary px-3 py-1 text-sm font-medium text-fg-secondary hover:bg-secondary_subtle"
                        onClick={() => loadObserverKpi.mutate(pid)}
                    >
                        {tm("observerKpi")}
                    </button>
                    <button
                        type="button"
                        className="rounded border border-secondary bg-primary px-3 py-1 text-sm font-medium text-fg-secondary hover:bg-secondary_subtle"
                        onClick={() => loadRisk.mutate(pid)}
                    >
                        {tm("riskKpi")}
                    </button>
                    <button
                        type="button"
                        className="rounded border border-secondary bg-primary px-3 py-1 text-sm font-medium text-fg-secondary hover:bg-secondary_subtle"
                        onClick={() => loadTalents.mutate(pid)}
                    >
                        {tm("talentSuggestions")}
                    </button>
                </div>
            </section>
            <section className="rounded-xl border border-secondary p-4">
                <h4 className="mb-2 font-medium text-fg-primary">{tm("arbitrageOptionsTitle")}</h4>
                {(detail.data?.arbitrage_options ?? []).map((o) => (
                    <div key={o.id} className="mb-2 flex flex-col gap-2 rounded-lg border border-secondary px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-fg-primary">{o.label}</p>
                            <p className="text-xs text-fg-tertiary">{o.rationale}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className="rounded border border-secondary bg-primary px-2 py-1 text-xs font-medium text-fg-secondary hover:bg-secondary_subtle"
                                onClick={() => strategistExecute.mutate(o.id)}
                            >
                                {tm("executeOption")}
                            </button>
                            <button
                                type="button"
                                className="rounded border border-secondary bg-primary px-2 py-1 text-xs font-medium text-fg-secondary hover:bg-secondary_subtle"
                                onClick={() => strategistReject.mutate(o.id)}
                            >
                                {tm("rejectOption")}
                            </button>
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );

    const decisionsBody = (
        <section className="rounded-xl border border-secondary p-4">
            <h4 className="mb-2 font-medium text-fg-primary">{tm("decisionsTimelineTitle")}</h4>
            {(decisionLog.data?.decisions ?? []).slice(0, 12).map((d) => (
                <div key={d.id} className="mb-2 rounded border border-secondary px-3 py-2 text-sm">
                    <p className="font-medium text-fg-primary">
                        {d.decision} · {d.scope}
                    </p>
                    <p className="text-fg-tertiary">{d.reason || "—"}</p>
                    <p className="mt-1 text-xs text-fg-tertiary">{new Date(d.created_at).toLocaleString(dateLocale)}</p>
                </div>
            ))}
            {!decisionLog.data?.decisions?.length ? <p className="text-sm text-fg-tertiary">{tm("noRecentDecisions")}</p> : null}
        </section>
    );

    const workspaceScroll = (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {workspaceTab === "overview" ? overviewBody : null}
            {workspaceTab === "team" ? teamBody : null}
            {workspaceTab === "risks" ? risksBody : null}
            {workspaceTab === "simulation" ? simulationBody : null}
            {workspaceTab === "decisions" ? decisionsBody : null}
        </div>
    );

    const centerColumn = (
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-secondary/50 lg:border-r">
            {workspaceNav}
            {workspaceScroll}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-3" onClick={onClose}>
            <div
                role="dialog"
                aria-modal
                aria-labelledby="mission-modal-title"
                className="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden rounded-2xl border border-secondary bg-primary text-fg-primary shadow-2xl ring-1 ring-secondary/80"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="sticky top-0 z-30 shrink-0 border-b border-secondary bg-primary/95 px-4 py-3 backdrop-blur-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-tertiary">{tm("headerEyebrow")}</p>
                            <h2 id="mission-modal-title" className="truncate text-lg font-semibold text-fg-primary sm:text-xl">
                                {projectName}
                            </h2>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className="rounded-full border border-secondary bg-secondary_subtle px-2.5 py-0.5 text-[11px] font-medium capitalize text-fg-primary">
                                    {String(statusBadge)}
                                </span>
                                <span className="rounded-full border border-brand-secondary/35 bg-brand-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-fg-primary">
                                    {String(decisionBadge)}
                                </span>
                                {scoreBadge != null ? (
                                    <span className="rounded-full border border-secondary bg-primary px-2.5 py-0.5 text-[11px] text-fg-secondary">
                                        {tm("badgeScore")}{" "}
                                        <span className="font-semibold tabular-nums text-fg-primary">
                                            {typeof scoreBadge === "number" ? scoreBadge.toFixed(1) : scoreBadge}
                                        </span>
                                    </span>
                                ) : null}
                                <span className="rounded-full border border-secondary bg-primary px-2.5 py-0.5 text-[11px] text-fg-secondary">
                                    {tm("badgePriority")} <span className="font-semibold text-fg-primary">{String(priorityBadge)}</span>
                                </span>
                                <span className="rounded-full border border-dashed border-secondary px-2.5 py-0.5 text-[11px] text-fg-tertiary">
                                    {tm("milestonePrefix")} {milestoneLabel}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="shrink-0 rounded-lg border border-secondary bg-primary_alt px-3 py-2 text-sm font-medium text-fg-secondary hover:bg-secondary_hover"
                            onClick={onClose}
                        >
                            {tm("closeButton")}
                        </button>
                    </div>
                </header>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
                    <nav
                        className="flex shrink-0 gap-1 overflow-x-auto border-b border-secondary bg-secondary_subtle/40 px-2 py-2"
                        aria-label={tm("navMissionMobileAria")}
                    >
                        {mobileChip("overview", tm("tabOverview"))}
                        {mobileChip("team", tm("tabTeam"))}
                        {mobileChip("risks", tm("tabRisks"))}
                        {mobileChip("simulation", tm("tabSimulation"))}
                        {mobileChip("decisions", tm("tabDecisions"))}
                        {mobileChip("copilot", tm("tabCopilot"))}
                    </nav>
                    <div className="min-h-0 flex-1 overflow-hidden">
                        {mobileMissionTab === "copilot" ? copilotColumn : null}
                        {mobileMissionTab === "overview" ? (
                            <div className="flex h-full min-h-0 flex-col overflow-y-auto">{overviewBody}</div>
                        ) : null}
                        {mobileMissionTab === "team" ? (
                            <div className="flex h-full min-h-0 flex-col overflow-y-auto p-1">{teamBody}</div>
                        ) : null}
                        {mobileMissionTab === "risks" ? (
                            <div className="flex h-full min-h-0 flex-col overflow-y-auto p-1">{risksBody}</div>
                        ) : null}
                        {mobileMissionTab === "simulation" ? (
                            <div className="flex h-full min-h-0 flex-col overflow-y-auto p-1">{simulationBody}</div>
                        ) : null}
                        {mobileMissionTab === "decisions" ? (
                            <div className="flex h-full min-h-0 flex-col overflow-y-auto p-1">{decisionsBody}</div>
                        ) : null}
                    </div>
                </div>

                <div className="hidden min-h-0 flex-1 overflow-hidden lg:grid lg:grid-cols-[22%_minmax(0,1fr)_28%]">
                    <aside className="min-h-0 overflow-y-auto border-r border-secondary/50 bg-secondary_subtle/10 p-2">{leftPanel}</aside>
                    {centerColumn}
                    {copilotColumn}
                </div>
            </div>
        </div>
    );
}
