import { isManagerNotificationUnread } from "@/lib/manager-notifications-normalize";
import { formatRelativeTimeFr } from "@/lib/rh-request-display";
import type { ManagerNotification, ManagerNotificationSeverity } from "@/types/manager-notifications.types";

export type AlertInboxSegment = "all" | "unread" | "critical" | "high";
export type AlertInboxPeriod = "all" | "7d" | "24h";
export type AlertInboxTimeSection = "today" | "this_week" | "older";

export type ManagerAlertGroup = {
    key: string;
    title: string;
    project_id: string | null;
    project_name: string | null;
    severity: ManagerNotificationSeverity;
    count: number;
    unread: boolean;
    latest_at: string;
    age_label: string;
    occurrences: ManagerNotification[];
};

export const SEVERITY_LABEL_FR: Record<ManagerNotificationSeverity, string> = {
    critical: "Critique",
    high: "Élevée",
    medium: "Moyenne",
    low: "Faible",
};

export const SEVERITY_DOT_CLASS: Record<ManagerNotificationSeverity, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-amber-400",
    low: "bg-slate-400",
};

export const SEVERITY_BAR_CLASS: Record<ManagerNotificationSeverity, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-amber-400",
    low: "bg-slate-300",
};

export const INBOX_SEGMENTS: { id: AlertInboxSegment; label: string }[] = [
    { id: "all", label: "Toutes" },
    { id: "unread", label: "Non lues" },
    { id: "critical", label: "Critiques" },
    { id: "high", label: "Élevées" },
];

export const INBOX_PERIODS: { id: AlertInboxPeriod; label: string }[] = [
    { id: "all", label: "Tout" },
    { id: "7d", label: "7 jours" },
    { id: "24h", label: "24 h" },
];

export const INBOX_SECTION_LABELS: Record<AlertInboxTimeSection, string> = {
    today: "Aujourd'hui",
    this_week: "Cette semaine",
    older: "Plus ancien",
};

export const INBOX_SECTION_ORDER: AlertInboxTimeSection[] = ["today", "this_week", "older"];

const SEVERITY_SORT: Record<ManagerNotificationSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
};

export function normalizeAlertTitle(title: string): string {
    return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Clé de regroupement : titre normalisé + projet + sévérité. */
export function alertGroupKey(alert: ManagerNotification): string {
    const project = (alert.project_id ?? alert.project_name ?? "").trim().toLowerCase();
    return `${normalizeAlertTitle(alert.title)}|${project}|${alert.severity}`;
}

function createdAtMs(iso: string): number {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : 0;
}

/**
 * Regroupe les alertes strictement par titre + projet + sévérité.
 * Date du groupe = occurrence la plus récente ; non lu si au moins une occurrence non lue.
 */
export function groupAlerts(alerts: ManagerNotification[]): ManagerAlertGroup[] {
    const map = new Map<string, ManagerAlertGroup>();

    for (const alert of alerts) {
        const key = alertGroupKey(alert);
        const existing = map.get(key);
        if (!existing) {
            map.set(key, {
                key,
                title: alert.title.trim() || "Alerte",
                project_id: alert.project_id,
                project_name: alert.project_name,
                severity: alert.severity,
                count: 1,
                unread: isManagerNotificationUnread(alert.status),
                latest_at: alert.created_at,
                age_label: alert.age_label || formatRelativeTimeFr(alert.created_at),
                occurrences: [alert],
            });
            continue;
        }

        existing.count += 1;
        existing.occurrences.push(alert);
        if (isManagerNotificationUnread(alert.status)) existing.unread = true;

        if (createdAtMs(alert.created_at) >= createdAtMs(existing.latest_at)) {
            existing.latest_at = alert.created_at;
            existing.age_label = alert.age_label || formatRelativeTimeFr(alert.created_at);
            if (alert.title.trim()) existing.title = alert.title.trim();
            if (alert.project_name) existing.project_name = alert.project_name;
            if (alert.project_id) existing.project_id = alert.project_id;
        }
    }

    for (const group of map.values()) {
        group.occurrences.sort((a, b) => createdAtMs(b.created_at) - createdAtMs(a.created_at));
    }

    return Array.from(map.values());
}

export function sortAlertGroups(groups: ManagerAlertGroup[]): ManagerAlertGroup[] {
    return [...groups].sort((a, b) => {
        if (a.unread !== b.unread) return a.unread ? -1 : 1;
        const sev = SEVERITY_SORT[a.severity] - SEVERITY_SORT[b.severity];
        if (sev !== 0) return sev;
        return createdAtMs(b.latest_at) - createdAtMs(a.latest_at);
    });
}

export function alertInboxTimeSection(iso: string, nowMs = Date.now()): AlertInboxTimeSection {
    const t = createdAtMs(iso);
    if (!t) return "older";

    const startOfToday = new Date(nowMs);
    startOfToday.setHours(0, 0, 0, 0);
    if (t >= startOfToday.getTime()) return "today";

    const weekAgo = nowMs - 7 * 24 * 3_600_000;
    if (t >= weekAgo) return "this_week";
    return "older";
}

export function groupMatchesPeriod(group: ManagerAlertGroup, period: AlertInboxPeriod, nowMs = Date.now()): boolean {
    if (period === "all") return true;
    const t = createdAtMs(group.latest_at);
    if (!t) return false;
    if (period === "24h") return nowMs - t <= 24 * 3_600_000;
    if (period === "7d") return nowMs - t <= 7 * 24 * 3_600_000;
    return true;
}

export function groupMatchesSegment(group: ManagerAlertGroup, segment: AlertInboxSegment): boolean {
    if (segment === "all") return true;
    if (segment === "unread") return group.unread;
    if (segment === "critical") return group.severity === "critical";
    if (segment === "high") return group.severity === "high";
    return true;
}

export function groupMatchesSearch(group: ManagerAlertGroup, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const hay = `${group.title} ${group.project_name ?? ""}`.toLowerCase();
    return hay.includes(q);
}

export function filterAlertGroups(
    groups: ManagerAlertGroup[],
    opts: { segment: AlertInboxSegment; period: AlertInboxPeriod; search: string; nowMs?: number },
): ManagerAlertGroup[] {
    const nowMs = opts.nowMs ?? Date.now();
    return sortAlertGroups(
        groups.filter(
            (g) =>
                groupMatchesSegment(g, opts.segment) &&
                groupMatchesPeriod(g, opts.period, nowMs) &&
                groupMatchesSearch(g, opts.search),
        ),
    );
}

export function countGroupsBySegment(groups: ManagerAlertGroup[]): Record<AlertInboxSegment, number> {
    return {
        all: groups.length,
        unread: groups.filter((g) => g.unread).length,
        critical: groups.filter((g) => g.severity === "critical").length,
        high: groups.filter((g) => g.severity === "high").length,
    };
}

export function partitionGroupsBySection(
    groups: ManagerAlertGroup[],
    nowMs = Date.now(),
): Record<AlertInboxTimeSection, ManagerAlertGroup[]> {
    const out: Record<AlertInboxTimeSection, ManagerAlertGroup[]> = {
        today: [],
        this_week: [],
        older: [],
    };
    for (const group of groups) {
        out[alertInboxTimeSection(group.latest_at, nowMs)].push(group);
    }
    for (const section of INBOX_SECTION_ORDER) {
        out[section] = sortAlertGroups(out[section]);
    }
    return out;
}

export function emptyStateMessage(segment: AlertInboxSegment): { title: string; description: string } {
    if (segment === "unread") {
        return {
            title: "Aucune alerte non lue — tout est sous contrôle",
            description: "Revenez plus tard ou élargissez les filtres.",
        };
    }
    if (segment === "critical") {
        return {
            title: "Aucune alerte critique",
            description: "Aucune alerte critique pour ces filtres.",
        };
    }
    if (segment === "high") {
        return {
            title: "Aucune alerte élevée",
            description: "Aucune alerte de sévérité élevée pour ces filtres.",
        };
    }
    return {
        title: "Aucune alerte",
        description: "Aucune alerte pour les filtres sélectionnés.",
    };
}

export function unreadOccurrenceIds(group: ManagerAlertGroup): string[] {
    return group.occurrences.filter((o) => isManagerNotificationUnread(o.status)).map((o) => o.id);
}
