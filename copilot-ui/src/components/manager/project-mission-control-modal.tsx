import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { buildStrictAssignTalentPayload } from "@/api/manager-projects.api";
import { ProjectMissionControlRisks } from "@/components/manager/project-mission-control-risks";
import { ProjectTasksTab } from "@/components/projects/tasks/ProjectTasksTab";
import { StrategistArbitrageOptions } from "@/components/manager/strategist-arbitrage-options";
import { stripTechnicalScoringSegments } from "@/lib/business-explanation";
import { readMissionControlHttpErrorMessage, readUserFacingApiErrorMessage } from "@/lib/user-facing-api-error";
import { useAuth } from "@/providers/auth-provider";
import { useProjectViabilityRefresh } from "@/hooks/use-project-viability-refresh";
import { useProjectStrategistArbitrage } from "@/hooks/use-project-strategist-arbitrage";
import {
    formatMissionProjectStatusLabel,
    pushStrategistStopScopeExecuteToast,
    resolveArbitrageOptionType,
} from "@/lib/strategist-arbitrage";
import { ProjectLifecycleStepper, type ProjectLifecycleProject } from "@/components/projects/ProjectLifecycleStepper";
import { WhatIfResultPanel, type WhatIfResponse } from "@/components/projects/WhatIfResultPanel";
import { useProjectTasks } from "@/hooks/use-project-tasks";
import { useDecisions } from "@/hooks/useDecisions";
import { useTeam } from "@/hooks/useTeam";
import type { CopilotDecision } from "@/services/decisions.api";
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
import type { MissionControlWorkspaceTabId } from "@/utils/workspace-routes";
import {
    formatMissionExecutiveSummary,
    formatProgressPercent,
    formatViabilityScore,
    normalizeProgressPctValue,
    readLatestKpiDelayDays,
    readLatestKpiHealthScore,
    readLatestKpiProgressPct,
    readLatestViabilityScore,
} from "@/utils/format";

export type { MissionControlWorkspaceTabId } from "@/utils/workspace-routes";

export type ProjectMissionControlWorkspaceProps = {
    projectId: string;
    listProject?: ProjectListItem;
    onClose: () => void;
    workspaceTab?: MissionControlWorkspaceTabId;
    onWorkspaceTabChange?: (tab: MissionControlWorkspaceTabId) => void;
};

type WorkspaceTabId = MissionControlWorkspaceTabId;
type MobileMissionTabId = WorkspaceTabId;

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

function confidencePercent(c: number | null | undefined): number {
    const n = Number(c ?? 0);
    if (!Number.isFinite(n)) return 0;
    if (n > 1 && n <= 100) return Math.round(n);
    return Math.round(n * 100);
}

function scoreDisplay(score: number | null | undefined): string {
    const n = Number(score ?? 0);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(1)} / 10`;
}

function decisionBadgeClass(decision: string): string {
    const k = String(decision ?? "").trim().toLowerCase();
    if (k === "continue" || k === "proceed") {
        return "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100";
    }
    if (k === "adjust") {
        return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100";
    }
    if (k === "stop" || k === "reject") {
        return "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100";
    }
    return "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-600 dark:bg-violet-950/45 dark:text-violet-100";
}

function statusPillClass(status: string | null | undefined): string {
    const v = String(status ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
    if (v === "on_hold" || v === "onhold") return "bg-amber-100 text-amber-800";
    if (v === "completed") return "bg-green-100 text-green-800";
    if (v === "active") return "bg-primary-100 text-primary-800";
    if (v === "planned") return "bg-slate-100 text-slate-700";
    if (v === "cancelled") return "bg-red-100 text-red-800";
    return "bg-slate-100 text-slate-700";
}

function decisionPillClass(decision: string | null | undefined): string {
    const k = String(decision ?? "").trim().toLowerCase();
    if (k === "continue" || k === "proceed") return "bg-emerald-100 text-emerald-800";
    if (k === "adjust") return "bg-amber-100 text-amber-800";
    if (k === "stop" || k === "reject") return "bg-red-100 text-red-800";
    return "bg-violet-100 text-violet-800";
}

function scoreBarTone(score: number): string {
    if (score < 4) return "bg-red-500";
    if (score < 7) return "bg-orange-500";
    return "bg-emerald-500";
}

type MissionKpiCardKind = "health" | "viability" | "alerts" | "talents" | "progress";

type MissionKpiCardProps = {
    label: string;
    value: string;
    unit?: string;
    scoreBarPct?: number | null;
    progressBarPct?: number | null;
    kind: MissionKpiCardKind;
    alertsCount?: number;
};

function kpiAccentBorder(kind: MissionKpiCardKind, scoreBarPct?: number | null, progressBarPct?: number | null, alertsCount = 0): string {
    if (kind === "talents") return "border-l-primary-500";
    if (kind === "alerts") {
        if (alertsCount >= 3) return "border-l-red-500";
        if (alertsCount >= 1) return "border-l-orange-500";
        return "border-l-emerald-500";
    }
    const score = scoreBarPct ?? (progressBarPct != null ? progressBarPct / 10 : null);
    if (score == null) return "border-l-slate-300";
    if (score < 4) return "border-l-red-500";
    if (score < 7) return "border-l-orange-500";
    return "border-l-emerald-500";
}

function KpiTrendHint({
    kind,
    scoreBarPct,
    progressBarPct,
    alertsCount = 0,
}: {
    kind: MissionKpiCardKind;
    scoreBarPct?: number | null;
    progressBarPct?: number | null;
    alertsCount?: number;
}) {
    let tone: "up" | "down" | "neutral" = "neutral";
    if (kind === "alerts") {
        tone = alertsCount >= 2 ? "down" : alertsCount === 0 ? "up" : "neutral";
    } else {
        const score = scoreBarPct ?? (progressBarPct != null ? progressBarPct / 10 : null);
        if (score != null) {
            if (score >= 7) tone = "up";
            else if (score < 4) tone = "down";
        }
    }

    const TrendIcon = tone === "up" ? TrendingUp : tone === "down" ? TrendingDown : Minus;
    const trendColor = tone === "up" ? "text-emerald-500" : tone === "down" ? "text-red-500" : "text-slate-400";
    const barTone =
        tone === "up"
            ? "from-emerald-200 via-emerald-400 to-emerald-200"
            : tone === "down"
              ? "from-red-200 via-red-400 to-red-200"
              : "from-slate-200 via-slate-300 to-slate-200";

    return (
        <div className="mt-3 flex items-center gap-2">
            <TrendIcon className={cx("size-3.5 shrink-0", trendColor)} aria-hidden />
            <div className={cx("h-1 flex-1 rounded-full bg-gradient-to-r opacity-80", barTone)} aria-hidden />
        </div>
    );
}

function MissionKpiCard({ label, value, unit, scoreBarPct, progressBarPct, kind, alertsCount = 0 }: MissionKpiCardProps) {
    const accent = kpiAccentBorder(kind, scoreBarPct, progressBarPct, alertsCount);

    return (
        <article
            className={cx(
                "flex min-h-[9rem] flex-col justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow duration-200 ease-out hover:shadow-md dark:border-secondary dark:bg-primary sm:min-h-[9.5rem]",
                "border-l-4",
                accent,
            )}
        >
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">{label}</p>
            <div className="mt-2 flex flex-1 flex-col justify-center">
                <p className="flex items-baseline gap-1.5 leading-none">
                    <span className="text-4xl font-bold tabular-nums text-slate-900 dark:text-fg-primary">{value}</span>
                    {unit ? <span className="text-base font-medium text-slate-500">{unit}</span> : null}
                </p>
                <KpiTrendHint kind={kind} scoreBarPct={scoreBarPct} progressBarPct={progressBarPct} alertsCount={alertsCount} />
                {scoreBarPct != null ? (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-secondary_subtle">
                        <div
                            className={cx("h-full rounded-full transition-all duration-200 ease-out", scoreBarTone(scoreBarPct))}
                            style={{ width: `${Math.min(100, Math.max(0, scoreBarPct * 10))}%` }}
                            aria-hidden
                        />
                    </div>
                ) : null}
                {progressBarPct != null ? (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-secondary_subtle">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-200 ease-out"
                            style={{ width: `${Math.min(100, Math.max(0, progressBarPct))}%` }}
                            aria-hidden
                        />
                    </div>
                ) : null}
            </div>
        </article>
    );
}

function decisionSummary(d: CopilotDecision): string {
    const raw = stripTechnicalScoringSegments(d.reason ?? "").replace(/\s+/g, " ").trim();
    if (!raw) return "—";
    if (raw.length <= 160) return raw;
    return `${raw.slice(0, 157)}…`;
}

function filterDecisionsForProject(
    decisions: CopilotDecision[],
    projectId: string,
    projectName?: string | null,
): CopilotDecision[] {
    const pidNorm = normalizeId(projectId);
    const nameNorm = String(projectName ?? "").trim().toLowerCase();
    return decisions.filter((d) => {
        const dPid = normalizeId(d.project_id);
        if (pidNorm && dPid && dPid === pidNorm) return true;
        if (String(d.project_id ?? "").trim() === String(projectId).trim()) return true;
        const dName = String(d.project_name ?? "").trim().toLowerCase();
        if (nameNorm && dName && dName === nameNorm) return true;
        return false;
    });
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

export function ProjectMissionControlWorkspace({
    projectId,
    listProject,
    onClose,
    workspaceTab: workspaceTabProp = "overview",
    onWorkspaceTabChange,
}: ProjectMissionControlWorkspaceProps) {
    const enabled = Boolean(projectId);
    const pid = projectId;
    const { user } = useAuth();

    const detail = useProjectDetail(pid);
    const decisionsQuery = useDecisions({ limit: 100, enabled: enabled && Boolean(pid) });
    const projectDecisions = useMemo(() => {
        const projectName = detail.data?.project?.name ?? listProject?.name ?? null;
        const filtered = filterDecisionsForProject(decisionsQuery.data?.decisions ?? [], pid, projectName);
        return [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [decisionsQuery.data?.decisions, detail.data?.project?.name, listProject?.name, pid]);
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
    const tasksQuery = useProjectTasks(pid, enabled);
    const { mutate: runViabilityRefresh } = useProjectViabilityRefresh();
    const viabilityScanKeyRef = useRef<string | null>(null);
    const [editPayload, setEditPayload] = useState({ status: "active" as ProjectStatus, priority: 5, milestone_at: "" });
    const { push: pushToast } = useToast();
    const assignmentTypeTouched = useRef(false);
    const [assignPayload, setAssignPayload] = useState<{
        talent_id: string;
        allocation_pct: number;
        assignment_type: WmpAssignmentType;
    }>({ talent_id: "", allocation_pct: 50, assignment_type: "part_time" });
    const [whatIfAllocationPct, setWhatIfAllocationPct] = useState("");
    const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTabId>(workspaceTabProp);
    const [mobileMissionTab, setMobileMissionTab] = useState<MobileMissionTabId>(workspaceTabProp);
    const applyWorkspaceTab = useCallback(
        (tab: WorkspaceTabId) => {
            setWorkspaceTab(tab);
            setMobileMissionTab(tab);
            onWorkspaceTabChange?.(tab);
        },
        [onWorkspaceTabChange],
    );

    const { t, i18n } = useTranslation("common");
    const tm = useCallback(
        (key: string, opts?: Record<string, string | number>) => {
            const k = `managerWorkspace.missionControl.${key}`;
            return String(opts ? t(k, opts as never) : t(k));
        },
        [t],
    );

    useEffect(() => {
        setWorkspaceTab(workspaceTabProp);
        setMobileMissionTab(workspaceTabProp);
    }, [workspaceTabProp, projectId]);

    useEffect(() => {
        if (!projectId) return;
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
    }, [projectId]);

    useEffect(() => {
        if (!pid) return;
        const enterpriseId = user?.enterpriseId?.trim();
        if (!enterpriseId) return;
        const sessionKey = `${pid}:${enterpriseId}`;
        if (viabilityScanKeyRef.current === sessionKey) return;

        viabilityScanKeyRef.current = sessionKey;
        runViabilityRefresh(
            { projectId: pid, enterpriseId },
            {
                onError: () => {
                    viabilityScanKeyRef.current = null;
                },
            },
        );
    }, [pid, runViabilityRefresh, user?.enterpriseId]);

    const editBaseline = useMemo(() => {
        if (!projectId) return null;
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

    const simulationTabActive = workspaceTab === "simulation" || mobileMissionTab === "simulation";
    const tasksTabActive = workspaceTab === "tasks" || mobileMissionTab === "tasks";

    const assignedTalentIds = useMemo(
        () => new Set((detail.data?.assignments ?? []).map((a) => a.talent_id)),
        [detail.data?.assignments],
    );

    const availableTalents = useMemo(
        () => (teamQuery.data?.talents ?? []).filter((talent) => !assignedTalentIds.has(talent.id)),
        [teamQuery.data?.talents, assignedTalentIds],
    );

    const taskAssignableTalents = useMemo(
        () =>
            (detail.data?.assignments ?? []).map((a) => ({
                id: a.talent_id,
                name: a.talent_name,
            })),
        [detail.data?.assignments],
    );
    const strategistArbitrage = useProjectStrategistArbitrage({
        open: enabled,
        projectId: pid,
        enterpriseId: user?.enterpriseId,
        detail: detail.data,
        detailLoading: !detail.data && !listProject,
        listProject,
        simulationTabActive,
    });

    const viabilityScore = useMemo(() => {
        if (detail.data) return readLatestViabilityScore(detail.data.latest_viability);
        const fromList = listProject?.latest_viability_score;
        if (fromList != null && Number.isFinite(Number(fromList))) return Number(fromList);
        return null;
    }, [detail.data, listProject?.latest_viability_score]);
    const viabilityFormatted = formatViabilityScore(viabilityScore);
    const latestKpi = detail.data?.latest_kpi;
    const progressPct = useMemo(() => {
        const fromKpi = readLatestKpiProgressPct(latestKpi);
        if (latestKpi != null) return fromKpi;
        if (!detail.data || listProject?.progress_pct == null) return null;
        const n = Number(listProject.progress_pct);
        return Number.isFinite(n) ? normalizeProgressPctValue(n) : null;
    }, [latestKpi, detail.data, listProject?.progress_pct]);
    const progressLabel = formatProgressPercent(progressPct);
    const health = readLatestKpiHealthScore(latestKpi);
    const delayDays = readLatestKpiDelayDays(latestKpi);
    const projectName = detail.data?.project?.name ?? listProject?.name ?? tm("projectNameFallback");
    const latestDecisionRaw = detail.data?.latest_viability?.decision ?? listProject?.latest_decision ?? null;
    const decisionBadge = latestDecisionRaw ?? "—";
    const viabilityDecision = latestDecisionRaw;
    const projectStatusRaw = detail.data?.project?.status ?? listProject?.status ?? null;
    const statusBadgeLabel = formatMissionProjectStatusLabel(projectStatusRaw, {
        planned: tm("statusOptionPlanned"),
        active: tm("statusOptionActive"),
        onHold: tm("statusOptionOnHold"),
        completed: tm("statusOptionCompleted"),
        cancelled: tm("statusOptionCancelled"),
    });

    const executiveSummary = useMemo(
        () =>
            formatMissionExecutiveSummary({
                viabilityScore,
                viabilityDecision,
                healthScore: health,
                progressPct,
                delayDays,
            }),
        [viabilityScore, viabilityDecision, health, progressPct, delayDays],
    );

    const whatIfPreviewText = useMemo(() => {
        const raw = whatIfAllocationPct.trim();
        const n = Number(raw);
        if (!raw || !Number.isFinite(n) || n <= 0) return tm("whatIfPreviewEmpty");
        return tm("whatIfPreviewActive", { pct: n });
    }, [whatIfAllocationPct, tm]);

    const allocationAdditional = useMemo((): number | null => {
        const raw = whatIfAllocationPct.trim();
        if (raw === "") return null;
        return Number(raw);
    }, [whatIfAllocationPct]);

    const canSimulate = useMemo(
        () =>
            allocationAdditional !== null &&
            allocationAdditional !== undefined &&
            !Number.isNaN(Number(allocationAdditional)) &&
            Number(allocationAdditional) > 0,
        [allocationAdditional],
    );

    const [whatIfValidationError, setWhatIfValidationError] = useState<string | null>(null);

    const clearWhatIfResults = useCallback(() => {
        whatIf.reset();
    }, [whatIf]);

    useEffect(() => {
        if (!canSimulate) {
            clearWhatIfResults();
            setWhatIfValidationError(null);
        }
    }, [canSimulate, clearWhatIfResults]);

    const handleSimulate = useCallback(() => {
        if (!canSimulate || allocationAdditional == null) {
            setWhatIfValidationError(tm("whatIfAllocRequired"));
            clearWhatIfResults();
            return;
        }
        setWhatIfValidationError(null);
        whatIf.mutate({
            projectId: pid,
            modifications: {
                allocation_pct: allocationAdditional,
            },
        });
    }, [canSimulate, allocationAdditional, pid, whatIf, tm, clearWhatIfResults]);

    const lifecyclePatchSource = useMemo(() => {
        const project = detail.data?.project;
        const rowMatches =
            listProject &&
            (String(listProject.id).trim() === String(projectId).trim() ||
                normalizeId(listProject.id) === normalizeId(projectId));
        return project ?? (rowMatches ? listProject : undefined);
    }, [detail.data?.project, listProject, projectId]);

    const lifecycleProject = useMemo((): ProjectLifecycleProject | null => {
        const src = lifecyclePatchSource;
        if (!src) return null;
        const p = detail.data?.project;
        const completedRaw = p && typeof p === "object" ? (p as { completed_at?: string | null }).completed_at : null;
        return {
            id: pid,
            status: statusForSelect(src.status),
            progress_pct: progressPct ?? Number(src.progress_pct) ?? 0,
            milestone_at: src.milestone_at ?? null,
            completed_at: completedRaw ?? (statusForSelect(src.status) === "completed" ? new Date().toISOString() : null),
            start_date: p?.start_date ?? (src as { start_date?: string | null }).start_date ?? null,
        };
    }, [lifecyclePatchSource, detail.data?.project, pid, progressPct]);

    const lifecycleTasks = useMemo(
        () => (tasksQuery.data?.tasks ?? []).map((task) => ({ id: task.id, status: task.status })),
        [tasksQuery.data?.tasks],
    );

    const handleLifecycleComplete = useCallback(async () => {
        const src = lifecyclePatchSource;
        if (!src) return;
        await updateProject.mutateAsync({
            projectId: pid,
            body: {
                status: "completed",
                priority: clamp(Number(src.priority ?? 5) || 5, 1, 10),
                milestone_at: src.milestone_at ?? null,
            },
        });
    }, [lifecyclePatchSource, pid, updateProject]);

    const handleLifecyclePause = useCallback(async () => {
        const src = lifecyclePatchSource;
        if (!src) return;
        await updateProject.mutateAsync({
            projectId: pid,
            body: {
                status: "on_hold",
                priority: clamp(Number(src.priority ?? 5) || 5, 1, 10),
                milestone_at: src.milestone_at ?? null,
            },
        });
    }, [lifecyclePatchSource, pid, updateProject]);

    if (!projectId) return null;

    const mobileChip = (id: MobileMissionTabId, label: string) => (
        <button
            type="button"
            key={id}
            role="tab"
            aria-selected={mobileMissionTab === id}
            onClick={() => applyWorkspaceTab(id)}
            className={cx(
                "shrink-0 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 sm:text-sm",
                mobileMissionTab === id
                    ? "border-primary-600 font-semibold text-primary-600"
                    : "border-transparent text-slate-500 hover:text-slate-800",
            )}
        >
            {label}
        </button>
    );

    const dateLocale = i18n.language === "ar" ? "ar" : i18n.language === "en" ? "en-GB" : "fr-FR";
    const milestoneLabel = (detail.data?.project?.milestone_at ?? listProject?.milestone_at)
        ? new Date((detail.data?.project?.milestone_at ?? listProject?.milestone_at) as string).toLocaleDateString(dateLocale, {
              day: "numeric",
              month: "short",
              year: "numeric",
          })
        : "—";
    const priorityBadge = detail.data?.project?.priority ?? listProject?.priority ?? "—";

    const workspaceNav = (
        <nav
            className="hidden shrink-0 border-b border-slate-200 px-4 sm:px-6 lg:flex lg:px-8 dark:border-secondary"
            aria-label={tm("navWorkspaceAria")}
            role="tablist"
        >
            <div className="flex w-full gap-1 overflow-x-auto">
                {(
                    [
                        { id: "overview" as const, labelKey: "tabOverview" as const },
                        { id: "team" as const, labelKey: "tabTeam" as const },
                        { id: "tasks" as const, labelKey: "tabTasks" as const },
                        { id: "risks" as const, labelKey: "tabRisks" as const },
                        { id: "simulation" as const, labelKey: "tabSimulation" as const },
                        { id: "decisions" as const, labelKey: "tabDecisions" as const },
                    ] as const
                ).map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={workspaceTab === tab.id}
                        onClick={() => applyWorkspaceTab(tab.id)}
                        className={cx(
                            "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
                            workspaceTab === tab.id
                                ? "border-primary-600 font-semibold text-primary-600"
                                : "border-transparent text-slate-500 hover:text-slate-800",
                        )}
                    >
                        {tm(tab.labelKey)}
                    </button>
                ))}
            </div>
        </nav>
    );

    const overviewBody = (
        <div className="space-y-6">
            {detail.isError && !detail.data ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                    {tm("partialDetailNote")}
                </p>
            ) : null}
            <section className="rounded-xl border border-slate-100 border-l-4 border-l-primary-500 bg-slate-50 p-5 shadow-sm dark:border-secondary dark:bg-secondary_subtle/30">
                <p className="mb-3 text-xs uppercase tracking-widest text-slate-400">{tm("execSummary")}</p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-fg-secondary">{executiveSummary}</p>
            </section>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <MissionKpiCard
                    label={tm("healthKpi")}
                    value={health != null ? health.toFixed(1) : "—"}
                    unit={health != null ? "/10" : undefined}
                    scoreBarPct={health}
                    kind="health"
                />
                <MissionKpiCard
                    label={tm("viabilityKpi")}
                    value={
                        viabilityScore != null && Number.isFinite(viabilityScore)
                            ? viabilityScore.toFixed(1)
                            : "—"
                    }
                    unit={viabilityScore != null ? "/10" : undefined}
                    scoreBarPct={viabilityScore}
                    kind="viability"
                />
                <MissionKpiCard
                    label={tm("alertsKpi")}
                    value={String(detail.data?.active_alerts?.length ?? 0)}
                    kind="alerts"
                    alertsCount={detail.data?.active_alerts?.length ?? 0}
                />
                <MissionKpiCard
                    label={tm("assignedTalentsKpi")}
                    value={String(detail.data?.assignments?.length ?? 0)}
                    kind="talents"
                />
                <MissionKpiCard
                    label={tm("progressKpi")}
                    value={progressPct != null ? String(Math.round(progressPct)) : "—"}
                    unit={progressPct != null ? "%" : undefined}
                    progressBarPct={progressPct}
                    kind="progress"
                />
            </section>
            <section className="relative overflow-hidden rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50 via-primary-50/80 to-primary-50 p-5 shadow-sm dark:border-primary-800/40 dark:from-primary-950/30 dark:to-primary-950/20">
                <span className="absolute right-4 top-4 rounded-full border border-primary-200/80 bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-600 shadow-sm backdrop-blur-sm dark:border-primary-700 dark:bg-primary-950/80 dark:text-primary-200">
                    IA
                </span>
                <div className="flex gap-4 pr-14">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-950/50">
                        <Sparkles className="size-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-700 dark:border-primary-700 dark:bg-primary-950/60 dark:text-primary-200">
                            <Sparkles className="size-3" aria-hidden />
                            {tm("aiRecoTitle")}
                        </span>
                        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-fg-secondary">
                            {tm("aiRecoBody", { milestone: milestoneLabel })}
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );

    const teamBody = (
        <div className="space-y-6">
            <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-secondary dark:bg-primary">
                <h4 className="mb-3 text-xs font-medium uppercase tracking-widest text-slate-400">{tm("projectStatusTitle")}</h4>
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

            <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-secondary dark:bg-primary">
                <h4 className="mb-3 text-xs font-medium uppercase tracking-widest text-slate-400">{tm("teamDeployedTitle")}</h4>
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
                                {availableTalents.map((talent, idx) => {
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

    const tasksBody = (
        <ProjectTasksTab projectId={pid} enabled={enabled && tasksTabActive} taskAssignableTalents={taskAssignableTalents} />
    );

    const risksBody = <ProjectMissionControlRisks risks={detail.data?.risks ?? []} />;

    const simulationBody = (
        <div className="space-y-4">
            <section className="relative overflow-hidden rounded-xl border border-secondary/80 bg-primary p-4 shadow-sm ring-1 ring-black/[0.04] transition-shadow hover:shadow-md dark:ring-white/[0.06] sm:p-5">
                <div className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-brand-primary/20 blur-3xl" aria-hidden />
                <div className="relative">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold tracking-tight text-fg-primary sm:text-base">{tm("whatIfTitle")}</h4>
                            <p className="mt-1 max-w-xl text-xs leading-relaxed text-fg-tertiary sm:text-sm">{tm("whatIfIntro")}</p>
                        </div>
                        <span className="inline-flex shrink-0 self-start rounded-full border border-brand-secondary/35 bg-gradient-to-r from-brand-primary/15 to-primary-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-secondary shadow-sm">
                            {tm("whatIfAiPowered")}
                        </span>
                    </div>
                    <label className="block space-y-1.5">
                        <span className="text-xs font-medium text-fg-secondary">{tm("extraAllocPct")}</span>
                        <input
                            value={whatIfAllocationPct}
                            onChange={(e) => setWhatIfAllocationPct(e.target.value)}
                            type="number"
                            min={0}
                            max={100}
                            inputMode="decimal"
                            placeholder={tm("placeholderAllocExample")}
                            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-fg-primary shadow-xs outline-none transition hover:border-brand-secondary/40 focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/20"
                        />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="rounded-lg border border-secondary bg-primary px-3 py-1.5 text-xs font-semibold text-fg-secondary shadow-xs transition hover:-translate-y-px hover:border-brand-secondary/40 hover:bg-secondary_subtle hover:shadow-sm active:translate-y-0"
                            onClick={() => setWhatIfAllocationPct("10")}
                        >
                            {tm("whatIfAdd10")}
                        </button>
                        <button
                            type="button"
                            className="rounded-lg border border-secondary bg-primary px-3 py-1.5 text-xs font-semibold text-fg-secondary shadow-xs transition hover:-translate-y-px hover:border-brand-secondary/40 hover:bg-secondary_subtle hover:shadow-sm active:translate-y-0"
                            onClick={() => setWhatIfAllocationPct("20")}
                        >
                            {tm("whatIfAdd20")}
                        </button>
                        <button
                            type="button"
                            className="rounded-lg border border-secondary bg-primary px-3 py-1.5 text-xs font-semibold text-fg-secondary shadow-xs transition hover:-translate-y-px hover:border-brand-secondary/40 hover:bg-secondary_subtle hover:shadow-sm active:translate-y-0"
                            onClick={() => setWhatIfAllocationPct("50")}
                        >
                            {tm("whatIfAdd50")}
                        </button>
                    </div>

                    <p className="mt-3 rounded-lg border border-secondary/70 bg-secondary_subtle/40 px-3 py-2.5 text-xs leading-relaxed text-fg-secondary sm:text-sm">
                        {whatIfPreviewText}
                    </p>

                    {!canSimulate ? (
                        <p
                            className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-100 sm:text-sm"
                            role="status"
                        >
                            {whatIfValidationError ?? tm("whatIfAllocRequired")}
                        </p>
                    ) : null}

                    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <button
                            type="button"
                            className="rounded-lg border border-secondary bg-primary px-4 py-2 text-sm font-semibold text-fg-secondary shadow-xs transition hover:-translate-y-px hover:bg-secondary_subtle hover:shadow-sm active:translate-y-0"
                            onClick={() => {
                                setWhatIfAllocationPct("");
                                setWhatIfValidationError(null);
                                clearWhatIfResults();
                            }}
                        >
                            {tm("reset")}
                        </button>
                        <button
                            type="button"
                            className="rounded-lg bg-brand-solid px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-brand-solid_hover hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                            disabled={!canSimulate || whatIf.isPending}
                            onClick={handleSimulate}
                        >
                            {whatIf.isPending ? tm("simulateRunning") : tm("runSimulation")}
                        </button>
                    </div>

                    {whatIf.data && canSimulate ? (
                        <div className="mt-4 border-t border-secondary/80 pt-4">
                            <WhatIfResultPanel data={whatIf.data as WhatIfResponse} />
                        </div>
                    ) : null}
                    {whatIf.isError && canSimulate ? (
                        <p className="mt-3 text-sm text-utility-error-600">
                            {readUserFacingApiErrorMessage(whatIf.error, tm("simulationFailedHelp"))}
                        </p>
                    ) : null}
                </div>
            </section>
            <StrategistArbitrageOptions
                options={strategistArbitrage.displayOptions}
                proposeLoading={strategistArbitrage.proposeLoading}
                managerSummary={strategistArbitrage.managerSummary}
                topRecommendationId={strategistArbitrage.topRecommendationId}
                onAccept={async (opt) => {
                    if (!user?.enterpriseId?.trim()) {
                        pushToast(tm("arbitrageErrorNoEnterprise"), "error");
                        return;
                    }
                    try {
                        const response = await strategistArbitrage.acceptOption(opt);
                        const summary =
                            response.decision_executed?.summary?.trim() ||
                            response.user_message?.trim() ||
                            tm("arbitrageAcceptedToast", { label: opt.label || opt.id });
                        const isStopScope = resolveArbitrageOptionType(opt) === "stop_scope";
                        if (isStopScope && response.action_taken) {
                            pushStrategistStopScopeExecuteToast(pushToast, response, summary, {
                                pausedDescription: tm("arbitrageStopScopePausedDesc"),
                            });
                            applyWorkspaceTab("overview");
                        } else {
                            pushToast(summary, "success", 8000);
                        }
                    } catch (error) {
                        pushToast(strategistArbitrage.readError(error), "error");
                        throw error;
                    }
                }}
                onReject={async (opt) => {
                    if (!user?.enterpriseId?.trim()) {
                        pushToast(tm("arbitrageErrorNoEnterprise"), "error");
                        return;
                    }
                    try {
                        await strategistArbitrage.rejectOption(opt);
                        pushToast(tm("arbitrageRejectedToast"), "neutral");
                    } catch (error) {
                        pushToast(strategistArbitrage.readError(error), "error");
                        throw error;
                    }
                }}
                onPropose={async () => {
                    if (!user?.enterpriseId?.trim()) {
                        pushToast(tm("arbitrageErrorNoEnterprise"), "error");
                        return;
                    }
                    try {
                        await strategistArbitrage.recalculate();
                        pushToast(tm("arbitrageProposeToast"), "success");
                    } catch (error) {
                        pushToast(strategistArbitrage.readError(error), "error");
                    }
                }}
            />
        </div>
    );

    const decisionsBody = (
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-secondary dark:bg-primary">
            <h4 className="mb-3 text-xs font-medium uppercase tracking-widest text-slate-400">{tm("decisionsTimelineTitle")}</h4>
            {projectDecisions.slice(0, 12).map((d) => (
                <div key={d.id} className="mb-2 rounded-lg border border-secondary px-3 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={cx(
                                "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                                decisionBadgeClass(d.decision),
                            )}
                        >
                            {d.decision}
                        </span>
                        <span className="text-xs text-fg-tertiary">{d.scope}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-fg-secondary">
                        <span>
                            <span className="text-fg-tertiary">{t("managerWorkspace.decisionLogPage.timelineScore")} · </span>
                            <span className="font-semibold tabular-nums text-fg-primary">{scoreDisplay(d.score)}</span>
                        </span>
                        <span>
                            <span className="text-fg-tertiary">{t("managerWorkspace.decisionLogPage.timelineConfidence")} · </span>
                            <span className="font-semibold tabular-nums text-fg-primary">{confidencePercent(d.confidence)}%</span>
                        </span>
                    </div>
                    <p className="mt-2 text-fg-secondary">{decisionSummary(d)}</p>
                    <p className="mt-1.5 text-xs text-fg-tertiary">{new Date(d.created_at).toLocaleString(dateLocale)}</p>
                </div>
            ))}
            {!projectDecisions.length ? <p className="text-sm text-fg-tertiary">{tm("noRecentDecisions")}</p> : null}
        </section>
    );

    const workspaceScroll = (
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-primary">
            {workspaceTab === "overview" ? overviewBody : null}
            {workspaceTab === "team" ? teamBody : null}
            {workspaceTab === "tasks" ? tasksBody : null}
            {workspaceTab === "risks" ? risksBody : null}
            {workspaceTab === "simulation" ? simulationBody : null}
            {workspaceTab === "decisions" ? decisionsBody : null}
        </div>
    );

    const lifecycleStepperBlock = lifecycleProject ? (
        <div className="shrink-0 px-4 pt-3 sm:px-6 lg:px-8 lg:pt-4">
            <div className="mb-3 w-full lg:mb-4">
                <ProjectLifecycleStepper
                    project={lifecycleProject}
                    tasks={lifecycleTasks}
                    onComplete={handleLifecycleComplete}
                    onPause={handleLifecyclePause}
                    readonly={updateProject.isPending}
                />
            </div>
        </div>
    ) : null;

    const missionWorkspace = (
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            {lifecycleStepperBlock}
            {workspaceNav}
            {workspaceScroll}
        </div>
    );

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 font-sans text-fg-primary antialiased dark:bg-primary">
            <header className="sticky top-0 z-30 shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">{tm("headerEyebrow")}</p>
                        <h1
                            id="mission-control-title"
                            className="mt-1 text-3xl font-bold leading-tight tracking-tight text-white"
                        >
                            {projectName}
                        </h1>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span
                                className={cx(
                                    "rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
                                    statusPillClass(projectStatusRaw),
                                )}
                            >
                                {statusBadgeLabel}
                            </span>
                            {latestDecisionRaw ? (
                                <span
                                    className={cx(
                                        "rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
                                        decisionPillClass(latestDecisionRaw),
                                    )}
                                >
                                    {String(decisionBadge)}
                                </span>
                            ) : null}
                            {viabilityScore != null ? (
                                <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-800 shadow-sm">
                                    {tm("badgeScore")}{" "}
                                    <span className="tabular-nums">{viabilityFormatted.header}</span>
                                </span>
                            ) : null}
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                                {tm("badgePriority")}{" "}
                                <span className="tabular-nums">{String(priorityBadge)}</span>
                            </span>
                            <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-800 shadow-sm">
                                {tm("milestonePrefix")} {milestoneLabel}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label={tm("closeButton")}
                        className="shrink-0 rounded-lg border border-white/25 bg-transparent px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:border-white/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                        onClick={onClose}
                    >
                        {tm("closeButton")}
                    </button>
                </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
                <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
                    {lifecycleStepperBlock}
                    <nav
                        className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 dark:border-secondary dark:bg-primary"
                        aria-label={tm("navMissionMobileAria")}
                        role="tablist"
                    >
                        {mobileChip("overview", tm("tabOverview"))}
                        {mobileChip("team", tm("tabTeam"))}
                        {mobileChip("tasks", tm("tabTasks"))}
                        {mobileChip("risks", tm("tabRisks"))}
                        {mobileChip("simulation", tm("tabSimulation"))}
                        {mobileChip("decisions", tm("tabDecisions"))}
                    </nav>
                    <div className="min-h-0 flex-1 overflow-hidden">
                        {mobileMissionTab === "overview" ? (
                            <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4 sm:px-6">{overviewBody}</div>
                        ) : null}
                        {mobileMissionTab === "team" ? (
                            <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4 sm:px-6">{teamBody}</div>
                        ) : null}
                        {mobileMissionTab === "tasks" ? (
                            <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4 sm:px-6">{tasksBody}</div>
                        ) : null}
                        {mobileMissionTab === "risks" ? (
                            <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4 sm:px-6">{risksBody}</div>
                        ) : null}
                        {mobileMissionTab === "simulation" ? (
                            <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4 sm:px-6">{simulationBody}</div>
                        ) : null}
                        {mobileMissionTab === "decisions" ? (
                            <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4 sm:px-6">{decisionsBody}</div>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="hidden min-h-0 flex-1 overflow-hidden lg:flex">{missionWorkspace}</div>
        </div>
    );
}
