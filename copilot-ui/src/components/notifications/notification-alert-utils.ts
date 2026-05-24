import { cleanAlertMessage } from "@/components/talent/talent-detail-shared";
import type { NotificationItem } from "@/types/api.types";

export type AlertSeverity = "critical" | "high" | "medium" | "low" | "unknown";

export type AlertQuickFilter = "today" | "week" | "overload" | "contract" | "dependency";

export type AlertKind = "overload" | "contract" | "skill_gap" | "dependency" | "generic";

export const SEVERITY_ORDER: AlertSeverity[] = ["critical", "high", "medium", "low"];

export function normalizeAlertSeverity(raw: string | undefined): AlertSeverity {
    const s = String(raw ?? "").trim().toLowerCase();
    if (s === "critical") return "critical";
    if (s === "high") return "high";
    if (s === "medium") return "medium";
    if (s === "low") return "low";
    return "unknown";
}

/** `public.notifications.id` — pour PATCH `.../manager/notifications/:id/ack`. */
export function readNotificationRowId(alert: NotificationItem): string | undefined {
    const id = String(alert.id ?? "").trim();
    return id || undefined;
}

/**
 * `public.risk_alerts.id` pour PATCH `.../manager/risk-alerts/:id`.
 * Ne pas utiliser `alert.id` : c'est l'id de la table notifications (WF_Manager_Notifications LIST_NOTIF).
 */
export function readRiskAlertPatchId(alert: NotificationItem): string | undefined {
    const id = String(alert.risk_alert_id ?? alert.alert_id ?? "").trim();
    return id || undefined;
}

/** Statut métier aligné sur WF_Manager_Notifications PATCH_ALERT. */
export type AlertWorkflowStatus = "open" | "resolved" | "ignored";

export function normalizeAlertWorkflowStatus(status: string | undefined): AlertWorkflowStatus {
    const s = String(status ?? "").trim().toLowerCase();
    if (s === "resolved" || s.includes("resolv")) return "resolved";
    if (s === "ignored" || s === "dismiss" || s.includes("ignor") || s.includes("dismiss")) return "ignored";
    return "open";
}

export function workflowStatusShowsResolveIgnore(status: string | undefined): boolean {
    return normalizeAlertWorkflowStatus(status) === "open";
}

export function workflowStatusShowsReopen(status: string | undefined): boolean {
    const workflow = normalizeAlertWorkflowStatus(status);
    return workflow === "resolved" || workflow === "ignored";
}

export function alertShowsResolveIgnore(alert: NotificationItem): boolean {
    return workflowStatusShowsResolveIgnore(alert.status);
}

export function alertShowsReopen(alert: NotificationItem): boolean {
    return workflowStatusShowsReopen(alert.status);
}

export function isClosedAlertStatus(status: string | undefined): boolean {
    const s = String(status ?? "").trim().toLowerCase();
    if (s === "ack" || s === "skipped" || s === "failed") return true;
    const workflow = normalizeAlertWorkflowStatus(status);
    return workflow === "resolved" || workflow === "ignored";
}

export function severityBorderClass(severity: AlertSeverity): string {
    switch (severity) {
        case "critical":
            return "border-l-4 border-l-rose-600";
        case "high":
            return "border-l-4 border-l-orange-500";
        case "medium":
            return "border-l-4 border-l-amber-500";
        case "low":
            return "border-l-4 border-l-slate-300 dark:border-l-slate-600";
        default:
            return "border-l-4 border-l-slate-200";
    }
}

export function inferAlertKind(riskType?: string, message?: string): AlertKind {
    const hay = `${riskType ?? ""} ${message ?? ""}`.toLowerCase();
    if (hay.includes("overload") || hay.includes("surcharge") || hay.includes("charge")) return "overload";
    if (hay.includes("contract") || hay.includes("contrat")) return "contract";
    if (hay.includes("skill") || hay.includes("compét") || hay.includes("compet") || hay.includes("formation"))
        return "skill_gap";
    if (hay.includes("depend") || hay.includes("dépend") || hay.includes("depend")) return "dependency";
    return "generic";
}

export function inferTalentName(alert: NotificationItem): string | null {
    const direct = String(alert.talent_name ?? "").trim();
    if (direct) return direct;
    const msg = cleanAlertMessage(alert.message || alert.title);
    const m = msg.match(/(?:talent|collaborateur|ressource)\s*[:\-]?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{2,60})/i);
    if (m?.[1]) return m[1].trim();
    const nameBeforeVerb = msg.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{2,40})\s+(?:dépasse|exceed|surpass)/i);
    if (nameBeforeVerb?.[1]) return nameBeforeVerb[1].trim();
    return null;
}

export function alertDisplayTitle(alert: NotificationItem, fallback: string): string {
    const title = String(alert.title ?? "").trim();
    if (title && title.length < 120) return cleanAlertMessage(title);
    const msg = cleanAlertMessage(alert.message);
    const firstLine = msg.split(/\r?\n/)[0]?.trim() ?? "";
    if (firstLine.length > 10 && firstLine.length < 120) return firstLine;
    return alert.project_name?.trim() || fallback;
}

export function alertDisplayMessage(alert: NotificationItem): string {
    return cleanAlertMessage(alert.message || alert.title) || "—";
}

export function formatDetectedLabel(
    alert: NotificationItem,
    t: (key: string, opts?: Record<string, string | number>) => string,
): string {
    const hours = alert.age_hours;
    if (typeof hours === "number" && Number.isFinite(hours)) {
        const h = Math.max(0, Math.round(hours));
        if (h < 1) return "Détectée il y a moins d’1 h";
        if (h === 1) return "Détectée il y a 1 h";
        return `Détectée il y a ${h} h`;
    }
    const iso = alert.created_at?.trim();
    if (!iso) return "—";
    const ts = new Date(iso).getTime();
    if (Number.isNaN(ts)) return "—";
    const h = Math.max(0, Math.round((Date.now() - ts) / 3_600_000));
    if (h < 1) return "Détectée il y a moins d’1 h";
    return t("managerWorkspace.notifications.detected", { hours: h });
}

export function matchesQuickFilter(alert: NotificationItem, filter: AlertQuickFilter): boolean {
    const kind = inferAlertKind(alert.risk_type, alert.message);
    const created = new Date(String(alert.created_at ?? "")).getTime();
    const ageHours =
        typeof alert.age_hours === "number" && Number.isFinite(alert.age_hours)
            ? alert.age_hours
            : Number.isNaN(created)
              ? 999
              : (Date.now() - created) / 3_600_000;

    switch (filter) {
        case "today":
            return ageHours <= 24;
        case "week":
            return ageHours <= 24 * 7;
        case "overload":
            return kind === "overload";
        case "contract":
            return kind === "contract";
        case "dependency":
            return kind === "dependency";
        default:
            return true;
    }
}

export type AlertFiltersState = {
    search: string;
    severity: string;
    type: string;
    projectId: string;
    talentId: string;
    status: string;
    showIgnored: boolean;
    quickFilters: Set<AlertQuickFilter>;
};

export function filterAlerts(items: NotificationItem[], filters: AlertFiltersState): NotificationItem[] {
    let list = items;

    if (!filters.showIgnored) {
        list = list.filter((a) => !isClosedAlertStatus(a.status));
    } else {
        list = list.filter((a) => isClosedAlertStatus(a.status));
    }

    if (filters.severity) {
        list = list.filter((a) => normalizeAlertSeverity(a.severity) === filters.severity);
    }

    if (filters.type) {
        list = list.filter((a) => String(a.risk_type ?? "").toLowerCase() === filters.type.toLowerCase());
    }

    if (filters.projectId) {
        list = list.filter((a) => String(a.project_id ?? "") === filters.projectId);
    }

    if (filters.talentId) {
        list = list.filter((a) => String(a.talent_id ?? "") === filters.talentId);
    }

    if (filters.status) {
        list = list.filter((a) => String(a.status ?? "").toLowerCase() === filters.status.toLowerCase());
    }

    if (filters.quickFilters.size > 0) {
        list = list.filter((a) => {
            for (const q of filters.quickFilters) {
                if (!matchesQuickFilter(a, q)) return false;
            }
            return true;
        });
    }

    const q = filters.search.trim().toLowerCase();
    if (q) {
        list = list.filter((a) => {
            const hay = [
                a.title,
                a.message,
                a.project_name,
                a.talent_name,
                inferTalentName(a),
                a.risk_type,
                a.severity,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
    }

    return list;
}

export function groupAlertsBySeverity(items: NotificationItem[]): Record<AlertSeverity, NotificationItem[]> {
    const groups: Record<AlertSeverity, NotificationItem[]> = {
        critical: [],
        high: [],
        medium: [],
        low: [],
        unknown: [],
    };
    for (const item of items) {
        groups[normalizeAlertSeverity(item.severity)].push(item);
    }
    return groups;
}
