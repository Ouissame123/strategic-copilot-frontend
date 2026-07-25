import type { ManagerDashboardV3Response } from "@/features/manager/types/dashboard-v3";
import type { ManagerDashboardV4Response } from "@/features/manager/types/dashboard-v4";
import type { RisksSummary } from "@/api/project-risks.api";
import type { DisplayAlert } from "@/components/risks/risks-shared";
import { kanbanColumnForAlert, severityRank } from "@/components/risks/risks-shared";
import { asRecord } from "@/utils/unwrap-api-payload";

export type RisksSegmentFilter = "all" | "critical" | "high" | "today";
export type RisksStatusFilter = "open" | "acknowledged" | "resolved" | "all";
export type RisksTimeBucket = "now" | "today" | "yesterday" | "week" | "older";

export interface ManagerRisksCounts {
    alerts_open?: number;
    critical?: number;
    high?: number;
    today?: number;
    overloaded_talents?: number;
    rh_pending?: number;
    all?: number;
}

export const RISKS_SEGMENT_FILTERS: { id: RisksSegmentFilter; label: string; tone: string }[] = [
    { id: "all", label: "Toutes", tone: "slate" },
    { id: "critical", label: "Critiques", tone: "red" },
    { id: "high", label: "High", tone: "orange" },
    { id: "today", label: "Aujourd'hui", tone: "violet" },
];

export const RISKS_STATUS_FILTERS: { id: RisksStatusFilter; label: string }[] = [
    { id: "open", label: "Ouvertes" },
    { id: "acknowledged", label: "Prises en charge" },
    { id: "resolved", label: "Résolues" },
    { id: "all", label: "Toutes" },
];

export const RISKS_BUCKET_LABELS: Record<RisksTimeBucket, string> = {
    now: "Moins de 4h",
    today: "Aujourd'hui",
    yesterday: "Hier",
    week: "7 derniers jours",
    older: "Plus ancien",
};

export const RISKS_BUCKET_ORDER: RisksTimeBucket[] = ["now", "today", "yesterday", "week", "older"];

export type RiskAlertDedupEntry = {
    alert: DisplayAlert;
    count: number;
    ids: string[];
    alerts: DisplayAlert[];
};

export function buildManagerRisksCounts(
    dashboard: ManagerDashboardV3Response | ManagerDashboardV4Response | undefined,
    summary: RisksSummary | undefined,
): ManagerRisksCounts | undefined {
    const counts: ManagerRisksCounts = {};
    const root = asRecord(dashboard);
    const riskAlerts = asRecord(root.risk_alerts);
    const ra = asRecord(riskAlerts.summary);
    const team = asRecord(root.team);
    const validationQueue = asRecord(asRecord(root.validation_queue).summary);

    if (typeof ra.total_open === "number") counts.alerts_open = ra.total_open;
    if (typeof summary?.critical === "number") counts.critical = summary.critical;
    else if (typeof ra.critical === "number") counts.critical = ra.critical;
    if (typeof summary?.high === "number") counts.high = summary.high;
    else if (typeof ra.high === "number") counts.high = ra.high;
    if (typeof ra.new_24h === "number") counts.today = ra.new_24h;
    if (typeof team.overloaded === "number") counts.overloaded_talents = team.overloaded;
    if (typeof validationQueue.total_pending === "number") {
        counts.rh_pending = validationQueue.total_pending;
    }

    return Object.keys(counts).length > 0 ? counts : undefined;
}

export function readSegmentCount(counts: ManagerRisksCounts | undefined, segment: RisksSegmentFilter): number | undefined {
    if (!counts) return undefined;
    if (segment === "all") return counts.alerts_open ?? counts.all;
    if (segment === "critical") return counts.critical;
    if (segment === "high") return counts.high;
    if (segment === "today") return counts.today;
    return undefined;
}

export function readAlertCreatedAtIso(alert: DisplayAlert): string | null {
    return alert.detectedAt?.trim() || null;
}

export function alertTimeBucket(alert: DisplayAlert, nowMs = Date.now()): RisksTimeBucket {
    const iso = readAlertCreatedAtIso(alert);
    if (!iso) return "older";
    const created = new Date(iso).getTime();
    if (!Number.isFinite(created)) return "older";
    const ageHours = (nowMs - created) / 3_600_000;
    if (ageHours < 4) return "now";
    if (ageHours < 24) return "today";
    if (ageHours < 48) return "yesterday";
    if (ageHours < 24 * 7) return "week";
    return "older";
}

export function alertMatchesTodaySegment(alert: DisplayAlert, nowMs = Date.now()): boolean {
    const bucket = alertTimeBucket(alert, nowMs);
    return bucket === "now" || bucket === "today";
}

export function alertMatchesSegmentFilter(alert: DisplayAlert, segment: RisksSegmentFilter, nowMs = Date.now()): boolean {
    if (segment === "all") return true;
    const sev = (alert.severity ?? "").toLowerCase();
    if (segment === "critical") return sev === "critical";
    if (segment === "high") return sev === "high";
    if (segment === "today") return alertMatchesTodaySegment(alert, nowMs);
    return true;
}

export function alertMatchesStatusFilter(alert: DisplayAlert, statusFilter: RisksStatusFilter): boolean {
    if (statusFilter === "all") return true;
    const column = kanbanColumnForAlert(alert);
    if (statusFilter === "open") return column === "open";
    if (statusFilter === "acknowledged") return column === "acknowledged";
    if (statusFilter === "resolved") return column === "resolved";
    return true;
}

export function alertMatchesSearch(alert: DisplayAlert, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const hay = `${alert.projectName} ${alert.message} ${alert.riskType ?? ""} ${alert.category}`.toLowerCase();
    return hay.includes(q);
}

/** Fingerprint strict — champs backend existants uniquement. */
export function riskAlertFingerprint(alert: DisplayAlert): string {
    return [alert.riskType ?? alert.category ?? "", alert.projectId ?? "", alert.severity ?? "", alert.patchId ?? ""].join("|");
}

export function dedupeRiskAlerts(alerts: DisplayAlert[]): RiskAlertDedupEntry[] {
    const map = new Map<string, RiskAlertDedupEntry>();
    for (const alert of alerts) {
        const key = riskAlertFingerprint(alert);
        const existing = map.get(key);
        if (existing) {
            existing.count += 1;
            existing.ids.push(alert.patchId);
            existing.alerts.push(alert);
        } else {
            map.set(key, { alert, count: 1, ids: [alert.patchId], alerts: [alert] });
        }
    }
    return Array.from(map.values());
}

export function sortRiskDedupEntries(entries: RiskAlertDedupEntry[]): RiskAlertDedupEntry[] {
    return [...entries].sort((a, b) => {
        const sr = severityRank(b.alert.severity) - severityRank(a.alert.severity);
        if (sr !== 0) return sr;
        const da = readAlertCreatedAtIso(a.alert);
        const db = readAlertCreatedAtIso(b.alert);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db.localeCompare(da);
    });
}

export function groupRiskDedupEntriesByBucket(
    entries: RiskAlertDedupEntry[],
    nowMs = Date.now(),
): Record<RisksTimeBucket, RiskAlertDedupEntry[]> {
    const groups: Record<RisksTimeBucket, RiskAlertDedupEntry[]> = {
        now: [],
        today: [],
        yesterday: [],
        week: [],
        older: [],
    };
    for (const entry of entries) {
        groups[alertTimeBucket(entry.alert, nowMs)].push(entry);
    }
    return groups;
}

export function severityLeftBorderClass(severity: string | undefined): string {
    const sev = (severity ?? "").toLowerCase();
    if (sev === "critical") return "border-l-4 border-l-red-500";
    if (sev === "high") return "border-l-4 border-l-orange-400";
    if (sev === "medium") return "border-l-4 border-l-amber-300";
    return "border-l-4 border-l-transparent";
}

export function riskTypeLabel(riskType: string | undefined): string {
    const key = (riskType ?? "").trim().toLowerCase();
    const labels: Record<string, string> = {
        overload: "Surcharge talent",
        resource_overload: "Surcharge projet",
        critical_skills_gap: "Compétences manquantes",
        conflict: "Conflit d'affectation",
        turnover: "Risque turnover",
        key_talent_dependency: "Dépendance talent clé",
        schedule_drift: "Dérive planning",
        fragility_high: "Fragilité élevée",
        health_warning: "Santé projet faible",
        data_quality_gap: "Données amont manquantes",
    };
    return labels[key] ?? riskType ?? "—";
}
