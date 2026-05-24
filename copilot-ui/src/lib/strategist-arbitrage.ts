import type { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { queryKeys } from "@/lib/query-keys";
import {
    readMissionControlHttpErrorMessage,
    readUserFacingApiErrorMessage,
} from "@/lib/user-facing-api-error";
import { invalidateManagerRiskQueries } from "@/hooks/use-manager-risk-data";
import type {
    AlertItem,
    ArbitrageOption,
    ArbitrageOptionType,
    ExecuteResponse,
    ProjectDetailResponse,
    ProjectKpiFull,
    ProjectListItem,
    StrategistExecuteActionTaken,
    ViabilityScore,
} from "@/types/api.types";
import type { ToastVariant } from "@/providers/toast-provider";
import { readLatestKpiDelayDays, readLatestKpiHealthScore, readLatestViabilityScore } from "@/utils/format";

export function resolveArbitrageOptionType(opt: ArbitrageOption): ArbitrageOptionType {
    if (opt.option_type) return opt.option_type;
    const label = opt.label.toLowerCase();
    if (label.includes("report") || label.includes("delay")) return "delay";
    if (label.includes("renforc") || label.includes("reinfor")) return "reinforce";
    if (label.includes("stop") || label.includes("scope")) return "stop_scope";
    return "reallocation";
}

function compareArbitrageOption(a: ArbitrageOption, b: ArbitrageOption): number {
    const ta = Date.parse(a.created_at ?? "") || 0;
    const tb = Date.parse(b.created_at ?? "") || 0;
    if (ta !== tb) return ta > tb ? 1 : -1;
    const ca = a.confidence ?? 0;
    const cb = b.confidence ?? 0;
    if (ca !== cb) return ca > cb ? 1 : -1;
    return 0;
}

const TYPE_ORDER: ArbitrageOptionType[] = ["reallocation", "delay", "reinforce", "stop_scope"];

/** Une carte par `option_type` — la plus récente, ou la meilleure `confidence`. */
export function dedupeArbitrageOptions(options: ArbitrageOption[]): ArbitrageOption[] {
    const filtered = options.filter((o) => (o.status ?? "proposed") !== "expired");
    const byType = new Map<ArbitrageOptionType, ArbitrageOption>();
    for (const opt of filtered) {
        const type = resolveArbitrageOptionType(opt);
        const existing = byType.get(type);
        if (!existing || compareArbitrageOption(opt, existing) > 0) {
            byType.set(type, opt);
        }
    }
    return TYPE_ORDER.map((t) => byType.get(t)).filter((o): o is ArbitrageOption => o != null);
}

export async function invalidateAfterStrategistArbitrage(qc: QueryClient, projectId?: string | null): Promise<void> {
    const pid = projectId?.trim();
    const tasks: Promise<unknown>[] = [
        qc.invalidateQueries({ queryKey: ["project-detail"] }),
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: queryKeys.projects.all }),
        qc.invalidateQueries({ queryKey: ["decisions"] }),
        qc.invalidateQueries({ queryKey: ["decision-log"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
        qc.invalidateQueries({ queryKey: ["notifications"] }),
        invalidateManagerRiskQueries(qc),
    ];
    if (pid) {
        tasks.push(
            qc.invalidateQueries({ queryKey: queryKeys.projectDetail(pid) }),
            qc.invalidateQueries({ queryKey: queryKeys.manager.projectDetail(pid) }),
            qc.invalidateQueries({ queryKey: queryKeys.projects.detail(pid) }),
            qc.refetchQueries({ queryKey: queryKeys.projectDetail(pid) }),
        );
    }
    await Promise.all(tasks);
}

function normalizeProjectStatusKey(raw: string | null | undefined): string {
    return String(raw ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
}

export function isProjectOnHold(status: string | null | undefined): boolean {
    const key = normalizeProjectStatusKey(status);
    return key === "on_hold" || key === "onhold";
}

export function resolveCopilotDisplayDecision(
    projectStatus: string | null | undefined,
    latestDecision: string | null | undefined,
    labels: { onHold: string },
): string {
    if (isProjectOnHold(projectStatus)) return labels.onHold;
    const decision = latestDecision?.trim();
    return decision || "—";
}

export function resolveCopilotDisplayInsight(
    projectStatus: string | null | undefined,
    explanation: string | null | undefined,
    onHoldInsight: string,
): string {
    if (isProjectOnHold(projectStatus)) return onHoldInsight;
    return explanation?.trim() ?? "";
}

export function formatMissionProjectStatusLabel(
    status: string | null | undefined,
    labels: {
        planned: string;
        active: string;
        onHold: string;
        completed: string;
        cancelled: string;
    },
): string {
    const key = normalizeProjectStatusKey(status);
    if (key === "planned") return labels.planned;
    if (key === "active") return labels.active;
    if (key === "on_hold" || key === "onhold") return labels.onHold;
    if (key === "completed") return labels.completed;
    if (key === "cancelled") return labels.cancelled;
    const raw = String(status ?? "").trim();
    return raw || "—";
}

function readExecuteActionTaken(raw: unknown): StrategistExecuteActionTaken | undefined {
    const value = String(raw ?? "").trim();
    if (value === "scope_reduced" || value === "project_paused" || value === "no_action_possible") {
        return value;
    }
    return undefined;
}

/** Normalise la réponse POST /strategist/execute (y compris payloads n8n). */
export function parseStrategistExecuteResponse(data: unknown): ExecuteResponse {
    if (data == null) return {};
    const root = Array.isArray(data) ? data[0] : data;
    if (typeof root !== "object" || root === null) return {};
    const bag = root as Record<string, unknown>;
    const nested = bag.json;
    const payload =
        typeof nested === "object" && nested !== null && !Array.isArray(nested)
            ? (nested as Record<string, unknown>)
            : bag;

    const action_taken = readExecuteActionTaken(payload.action_taken);
    const user_message = typeof payload.user_message === "string" ? payload.user_message.trim() : undefined;

    return {
        status: typeof payload.status === "string" ? payload.status : undefined,
        workflow: typeof payload.workflow === "string" ? payload.workflow : undefined,
        action_type: typeof payload.action_type === "string" ? payload.action_type : undefined,
        action_taken,
        user_message: user_message || undefined,
        decision_id: typeof payload.decision_id === "string" ? payload.decision_id : undefined,
        dropped_requirements_count:
            typeof payload.dropped_requirements_count === "number"
                ? payload.dropped_requirements_count
                : undefined,
        project_paused: Boolean(payload.project_paused),
        success: payload.success === undefined ? undefined : Boolean(payload.success),
        meta:
            typeof payload.meta === "object" && payload.meta !== null
                ? (payload.meta as ExecuteResponse["meta"])
                : undefined,
    };
}

export type StrategistStopScopeToastLabels = {
    pausedDescription: string;
};

const STOP_SCOPE_TOAST_DURATION_MS = 8000;

/** Toast métier après acceptation Stop / Scope (WF_Strategist_Accept). */
export function pushStrategistStopScopeExecuteToast(
    push: (message: string, variant?: ToastVariant, durationMs?: number, description?: string) => void,
    response: ExecuteResponse,
    fallbackMessage: string,
    labels: StrategistStopScopeToastLabels,
): void {
    const message = response.user_message?.trim() || fallbackMessage;
    const durationMs = STOP_SCOPE_TOAST_DURATION_MS;

    if (response.action_taken === "project_paused") {
        push(message, "warning", durationMs, labels.pausedDescription);
        return;
    }
    if (response.action_taken === "scope_reduced") {
        push(message, "success", durationMs);
        return;
    }
    push(message, "info", durationMs);
}

export type StrategistFragileSignals = {
    latestViabilityScore: number | null;
    latestDecision: string | null;
    highCriticalOpenAlerts: number;
    delayDays: number | null;
    capacityLoadPct: number | null;
    projectHealthScore: number | null;
};

export function countHighCriticalOpenAlerts(alerts: AlertItem[]): number {
    return alerts.filter((a) => {
        const s = String(a.severity ?? "")
            .trim()
            .toLowerCase();
        return s === "high" || s === "critical";
    }).length;
}

export function buildStrategistFragileSignals(input: {
    latestViability?: ViabilityScore | null;
    latestViabilityScoreFallback?: number | null;
    latestDecisionFallback?: string | null;
    activeAlerts?: AlertItem[];
    latestKpi?: ProjectKpiFull | null;
}): StrategistFragileSignals {
    const scoreFromViability = readLatestViabilityScore(input.latestViability);
    const fallback = input.latestViabilityScoreFallback;
    const latestViabilityScore =
        scoreFromViability ??
        (fallback != null && Number.isFinite(Number(fallback)) ? Number(fallback) : null);

    const latestDecision = input.latestViability?.decision ?? input.latestDecisionFallback ?? null;

    const loadRaw = input.latestKpi?.capacity_load_pct;
    const capacityLoadPct =
        loadRaw != null && Number.isFinite(Number(loadRaw)) ? Number(loadRaw) : null;

    return {
        latestViabilityScore,
        latestDecision: latestDecision != null ? String(latestDecision) : null,
        highCriticalOpenAlerts: countHighCriticalOpenAlerts(input.activeAlerts ?? []),
        delayDays: readLatestKpiDelayDays(input.latestKpi),
        capacityLoadPct,
        projectHealthScore: readLatestKpiHealthScore(input.latestKpi),
    };
}

/** Conditions alignées sur le déclenchement backend Strategist (projet fragile). */
export function isFragileProjectForStrategistPropose(signals: StrategistFragileSignals): boolean {
    if (signals.latestViabilityScore == null || signals.latestViabilityScore >= 6) return false;

    const decision = String(signals.latestDecision ?? "").trim();
    if (decision !== "Adjust" && decision !== "Stop") return false;

    if (signals.highCriticalOpenAlerts <= 0) return false;
    if (signals.delayDays == null || signals.delayDays <= 0) return false;
    if (signals.capacityLoadPct == null || signals.capacityLoadPct < 100) return false;
    if (signals.projectHealthScore == null || signals.projectHealthScore >= 6) return false;

    return true;
}

export function buildStrategistFragileSignalsFromDetail(
    detail: ProjectDetailResponse | null | undefined,
    listProject?: ProjectListItem,
): StrategistFragileSignals {
    return buildStrategistFragileSignals({
        latestViability: detail?.latest_viability,
        latestViabilityScoreFallback: listProject?.latest_viability_score,
        latestDecisionFallback: listProject?.latest_decision,
        activeAlerts: detail?.active_alerts,
        latestKpi: detail?.latest_kpi,
    });
}

export function hasProposedArbitrageOptions(options: ArbitrageOption[]): boolean {
    return options.some((o) => (o.status ?? "proposed") === "proposed");
}

export function mergeArbitrageOptionsById(
    current: Record<string, ArbitrageOption>,
    incoming: ArbitrageOption[],
): Record<string, ArbitrageOption> {
    if (!incoming.length) return current;
    const next = { ...current };
    for (const opt of incoming) {
        if (opt.id) next[opt.id] = opt;
    }
    return next;
}

/** Remplace les options `proposed` par la réponse propose ; conserve executed/rejected. */
export function mergeProposeArbitrageOptions(
    current: Record<string, ArbitrageOption>,
    incoming: ArbitrageOption[],
    replaceProposed: boolean,
): Record<string, ArbitrageOption> {
    const next = { ...current };
    if (replaceProposed) {
        for (const [id, opt] of Object.entries(next)) {
            if ((opt.status ?? "proposed") === "proposed") delete next[id];
        }
    }
    return mergeArbitrageOptionsById(next, incoming);
}

export function arbitrageOptionsFromMap(map: Record<string, ArbitrageOption>): ArbitrageOption[] {
    return Object.values(map);
}

export function readStrategistArbitrageErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
        const st = error.response?.status;
        if (st === 404) {
            return readUserFacingApiErrorMessage(error, "Option déjà traitée ou introuvable.");
        }
        if (st === 400) {
            return readUserFacingApiErrorMessage(error, "Requête invalide.");
        }
    }
    return readMissionControlHttpErrorMessage(error);
}
