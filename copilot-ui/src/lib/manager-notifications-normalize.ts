import type {
    ManagerNotifCounts,
    ManagerNotification,
    ManagerNotificationIconType,
    ManagerNotificationSeverity,
    ManagerNotificationStatus,
    ManagerNotificationTimeBucket,
} from "@/types/manager-notifications.types";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

const SEVERITIES: ManagerNotificationSeverity[] = ["critical", "high", "medium", "low"];
const STATUSES: ManagerNotificationStatus[] = ["pending", "sent", "ack", "failed"];
const BUCKETS: ManagerNotificationTimeBucket[] = ["today", "yesterday", "this_week", "older"];
const ICON_TYPES: ManagerNotificationIconType[] = [
    "overload",
    "compliance",
    "budget",
    "delay",
    "skill_gap",
    "turnover",
    "info",
];

function readString(raw: unknown): string {
    return raw != null ? String(raw).trim() : "";
}

function normalizeSeverity(raw: unknown): ManagerNotificationSeverity {
    const s = readString(raw).toLowerCase() as ManagerNotificationSeverity;
    return SEVERITIES.includes(s) ? s : "low";
}

function normalizeStatus(raw: unknown): ManagerNotificationStatus {
    const s = readString(raw).toLowerCase() as ManagerNotificationStatus;
    if (STATUSES.includes(s)) return s;
    if (s === "read" || s === "acknowledged") return "ack";
    return "pending";
}

function normalizeBucket(raw: unknown): ManagerNotificationTimeBucket {
    const b = readString(raw).toLowerCase() as ManagerNotificationTimeBucket;
    return BUCKETS.includes(b) ? b : "older";
}

function normalizeIconType(raw: unknown): ManagerNotificationIconType {
    const v = readString(raw).toLowerCase() as ManagerNotificationIconType;
    return ICON_TYPES.includes(v) ? v : "info";
}

function inferAgeLabel(createdAt: string, ageLabelRaw: string): string {
    if (ageLabelRaw) return ageLabelRaw;
    if (!createdAt) return "";
    const t = new Date(createdAt).getTime();
    if (Number.isNaN(t)) return "";
    const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (sec < 45) return "à l'instant";
    const min = Math.floor(sec / 60);
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `il y a ${d} j`;
    return new Date(createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function normalizeManagerNotification(raw: unknown): ManagerNotification | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const id = readString(r.id);
    if (!id) return null;
    const created_at = readString(r.created_at ?? r.createdAt);
    const projectIdRaw = readString(r.project_id ?? r.projectId);
    const riskAlertId = readString(r.risk_alert_id ?? r.riskAlertId ?? r.alert_id ?? r.alertId);
    return {
        id,
        project_id: projectIdRaw || null,
        project_name: readString(r.project_name ?? r.projectName) || null,
        severity: normalizeSeverity(r.severity),
        title: readString(r.title) || readString(r.message) || "Notification",
        message: readString(r.message) || readString(r.title) || "",
        status: normalizeStatus(r.status),
        icon_type: normalizeIconType(r.icon_type ?? r.iconType),
        age_label: inferAgeLabel(created_at, readString(r.age_label ?? r.ageLabel)),
        time_bucket: normalizeBucket(r.time_bucket ?? r.timeBucket),
        occurrence_count: Math.max(1, Number(r.occurrence_count ?? r.occurrenceCount) || 1),
        created_at,
        risk_alert_id: riskAlertId || undefined,
    };
}

export function normalizeManagerNotificationsList(raw: unknown): ManagerNotification[] {
    const root = unwrapN8nRoot(raw) as Record<string, unknown>;
    const listRaw = root.notifications ?? root.items ?? root.data;
    const arr = Array.isArray(listRaw)
        ? listRaw
        : listRaw && typeof listRaw === "object" && Array.isArray((listRaw as Record<string, unknown>).notifications)
          ? ((listRaw as Record<string, unknown>).notifications as unknown[])
          : [];
    return arr.map((row) => normalizeManagerNotification(row)).filter((n): n is ManagerNotification => n != null);
}

export function normalizeManagerNotifCounts(raw: unknown): ManagerNotifCounts {
    const root = unwrapN8nRoot(raw) as Record<string, unknown>;
    const countsRaw = (root.counts && typeof root.counts === "object" ? root.counts : root) as Record<string, unknown>;
    const num = (key: string) => {
        const v = Number(countsRaw[key]);
        return Number.isFinite(v) ? v : 0;
    };
    return {
        unread_count: num("unread_count"),
        unread_critical: num("unread_critical"),
        unread_high: num("unread_high"),
        unread_medium: num("unread_medium"),
        unread_low: num("unread_low"),
        unread_24h: num("unread_24h"),
        total: num("total"),
    };
}

export function isManagerNotificationUnread(status: ManagerNotificationStatus | string): boolean {
    const s = readString(status).toLowerCase();
    return s === "pending" || s === "sent";
}
