import { readOptionalAlertText } from "@/lib/risk-alert-display";
import { getUrgencyLevel } from "@/lib/risk-alert-display";
import type { ManagerRiskAlertPatchAction } from "@/services/notifications.api";
import type { AlertItem, TopAlert } from "@/types/api.types";
import { cx } from "@/utils/cx";

export type DisplayAlert = {
    /** Clé React / DnD — alignée sur `risk_alerts.id` quand disponible */
    patchId: string;
    /** Identifiant ligne notification ou item (peut différer de risk_alerts.id) */
    id?: string;
    alertId?: string;
    riskAlertId?: string;
    severity: string;
    projectName: string;
    projectId?: string;
    category: string;
    riskType?: string;
    message: string;
    title?: string;
    description?: string;
    rationale?: string;
    reason?: string;
    riskScore?: number;
    priorityOrder?: number;
    ageHours?: number;
    detectedAt?: string;
    sourceAgent?: string;
    status?: string;
};

export type RiskLeaderboardRow = {
    project_id?: string;
    project_name?: string;
    risk_score?: number;
    risk_level?: string;
    drivers?: Record<string, number>;
    computed_at?: string;
};

export type KanbanColumnId = "open" | "acknowledged" | "resolved";

export type RiskQuickFilterId = "my_projects" | "critical_only" | "today" | "talents" | "projects" | "watchdog_only";

export function severityBadgeClass(sev: string | undefined): string {
    const v = (sev ?? "").toLowerCase();
    if (v === "critical") return "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200";
    if (v === "high") return "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100";
    if (v === "medium") return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100";
    return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100";
}

export function scoreColorClass(score: number | null | undefined): string {
    if (score == null || !Number.isFinite(score)) return "text-slate-500 dark:text-slate-400";
    if (score >= 7) return "text-rose-600 dark:text-rose-400";
    if (score >= 5) return "text-amber-600 dark:text-amber-400";
    return "text-emerald-600 dark:text-emerald-400";
}

export function timeAgo(iso: string | null | undefined): string {
    if (!iso) return "à l'instant";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "à l'instant";
    const diffMs = Date.now() - d.getTime();
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
}

export function clamp(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
}

export function readAvgRiskScore(summary: { avg_risk_score?: number | null } | null | undefined): number | null {
    const raw = summary?.avg_risk_score;
    if (raw == null || !Number.isFinite(Number(raw))) return null;
    return clamp(Number(raw), 0, 10);
}

export function severityRank(sev: string | undefined): number {
    const v = (sev ?? "").toLowerCase();
    if (v === "critical") return 4;
    if (v === "high") return 3;
    if (v === "medium") return 2;
    if (v === "low") return 1;
    return 0;
}

function readPriorityOrderField(raw: Record<string, unknown>): number | undefined {
    const v = raw.priority_order;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return undefined;
}

function readAgeHoursField(raw: Record<string, unknown>): number | undefined {
    const v = raw.age_hours;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    return undefined;
}

function readStringField(raw: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const v = raw[key];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return undefined;
}

/** ID attendu par PATCH `/webhook/wmn-alert-v3/manager/risk-alerts/:id` (`public.risk_alerts.id`). */
export function resolveRiskAlertPatchId(alert: DisplayAlert): string | undefined {
    const alertId = (alert.alertId ?? alert.riskAlertId ?? alert.id ?? "").trim();
    return alertId || undefined;
}

export type RiskAlertPatchRequest = {
    alert: DisplayAlert;
    action: ManagerRiskAlertPatchAction;
    note?: string;
};

export function toDisplayFromTop(a: TopAlert): DisplayAlert {
    const raw = a as unknown as Record<string, unknown>;
    const extra = readOptionalAlertText(raw);
    const rowId = String(a.id ?? "").trim();
    const alertId =
        (a.alert_id ?? a.risk_alert_id ?? readStringField(raw, "alert_id", "risk_alert_id", "alertId", "riskAlertId") ?? "").trim() ||
        undefined;
    const riskAlertId = (a.risk_alert_id ?? alertId ?? readStringField(raw, "risk_alert_id", "riskAlertId") ?? "").trim() || undefined;
    const patchId = alertId ?? riskAlertId ?? rowId;
    return {
        patchId,
        id: rowId || undefined,
        alertId,
        riskAlertId,
        severity: a.severity ?? "medium",
        projectName: a.project_name ?? "Projet",
        projectId: a.project_id,
        category: a.category ?? a.risk_type ?? "—",
        riskType: a.risk_type,
        message: (a.message ?? a.title ?? "Alerte").trim() || "—",
        title: a.title?.trim() || undefined,
        description: a.description ?? extra.description,
        rationale: a.rationale ?? extra.rationale,
        reason: a.reason ?? extra.reason,
        riskScore: typeof a.risk_score === "number" ? a.risk_score : undefined,
        priorityOrder: a.priority_order ?? readPriorityOrderField(a as unknown as Record<string, unknown>),
        ageHours:
            typeof a.age_hours === "number" && Number.isFinite(a.age_hours)
                ? a.age_hours
                : readAgeHoursField(a as unknown as Record<string, unknown>),
        detectedAt: a.created_at,
        sourceAgent: undefined,
        status: a.status,
    };
}

export function toDisplayFromRiskItem(a: AlertItem): DisplayAlert {
    const raw = a as unknown as Record<string, unknown>;
    const extra = readOptionalAlertText(raw);
    const rowId = String(a.id ?? "").trim();
    const alertId =
        (a.alert_id ?? a.risk_alert_id ?? readStringField(raw, "alert_id", "risk_alert_id") ?? "").trim() || undefined;
    const riskAlertId = (a.risk_alert_id ?? alertId ?? "").trim() || undefined;
    const patchId = alertId ?? riskAlertId ?? rowId;
    return {
        patchId,
        id: rowId || undefined,
        alertId,
        riskAlertId,
        severity: a.severity ?? "medium",
        projectName: a.project_name ?? "Projet",
        projectId: a.project_id,
        category: a.category ?? a.risk_type ?? "—",
        riskType: a.risk_type,
        message: (a.message ?? a.title ?? "").trim() || "—",
        title: a.title?.trim() || undefined,
        description: a.description ?? extra.description,
        rationale: a.rationale ?? extra.rationale,
        reason: a.reason ?? extra.reason,
        riskScore: typeof a.risk_score === "number" ? a.risk_score : undefined,
        priorityOrder: a.priority_order ?? readPriorityOrderField(a as unknown as Record<string, unknown>),
        ageHours:
            typeof a.age_hours === "number" && Number.isFinite(a.age_hours)
                ? a.age_hours
                : readAgeHoursField(a as unknown as Record<string, unknown>),
        detectedAt: a.detected_at,
        sourceAgent: a.source_agent,
        status: a.status,
    };
}

export function priorityQueueRationale(items: DisplayAlert[]): string {
    if (!items.length) return "Aucune alerte à prioriser avec les filtres actuels.";
    const uniqueProjects = new Set(items.map((a) => a.projectName).filter(Boolean));
    const n = items.length;
    const p = uniqueProjects.size;
    if (p <= 1) {
        const first = items[0];
        return `À traiter en premier : ${first.projectName}, alerte ${first.severity} prioritaire.`;
    }
    return `À traiter en premier : ${n} risque${n > 1 ? "s" : ""} majeur${n > 1 ? "s" : ""} sur ${p} projet${p > 1 ? "s" : ""} différent${p > 1 ? "s" : ""}.`;
}

export function kanbanColumnForAlert(alert: DisplayAlert): KanbanColumnId {
    const s = (alert.status ?? "").toLowerCase().trim();
    if (!s || s === "open" || s === "new") return "open";
    if (s.includes("resolv") || s === "closed" || s === "dismissed" || s === "ignored" || s.includes("ignor")) return "resolved";
    if (s.includes("invest") || s === "in_progress" || s === "acknowledged") return "acknowledged";
    return "open";
}

export function matchesQuickFilter(
    alert: DisplayAlert,
    filter: RiskQuickFilterId,
    managerProjectIds: Set<string>,
): boolean {
    switch (filter) {
        case "my_projects":
            return alert.projectId ? managerProjectIds.has(alert.projectId) : true;
        case "critical_only": {
            const sev = (alert.severity ?? "").toLowerCase();
            return sev === "critical" || sev === "high";
        }
        case "today": {
            const u = getUrgencyLevel({
                severity: alert.severity,
                risk_score: alert.riskScore,
                priority_order: alert.priorityOrder,
                detected_at: alert.detectedAt,
                age_hours: alert.ageHours,
            });
            return u === "today" || u === "urgent";
        }
        case "talents": {
            const hay = `${alert.category} ${alert.riskType ?? ""} ${alert.message}`.toLowerCase();
            return (
                hay.includes("overload") ||
                hay.includes("surcharge") ||
                hay.includes("anxiety") ||
                hay.includes("anxiété") ||
                hay.includes("depend") ||
                hay.includes("talent")
            );
        }
        case "projects":
            return Boolean(alert.projectId?.trim());
        case "watchdog_only": {
            const src = (alert.sourceAgent ?? "").toLowerCase();
            const msg = alert.message.toLowerCase();
            return src.includes("watchdog") || msg.includes("watchdog");
        }
        default:
            return true;
    }
}

export function displayAlertToHeatmapInput(a: DisplayAlert) {
    return {
        severity: a.severity,
        risk_score: a.riskScore,
        priority_order: a.priorityOrder,
        detected_at: a.detectedAt,
        age_hours: a.ageHours,
        project_name: a.projectName,
    };
}

export const RISK_PAGE_BG = "min-h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900";

export const RISK_CARD = cx(
    "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900",
    "transition-all duration-200",
);
