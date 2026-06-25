import {
    AlertOctagon,
    AlertTriangle,
    Bell,
    CalendarX,
    TrendingUp,
    UserX,
    type LucideIcon,
} from "lucide-react";
import type { RhNotification, NotificationType } from "@/types/rh-notifications.types";

export type NotificationSeverity = RhNotification["severity"];

export interface NotificationTypeConfig {
    label: string;
    icon: LucideIcon;
    badgeCls: string;
    iconCls: string;
    target: string | ((n: RhNotification) => string);
}

export interface SeverityConfig {
    label: string;
    badgeCls: string;
    dotCls: string;
    borderCls: string;
    pulse?: boolean;
}

export const NOTIFICATION_TYPE_CONFIG: Record<string, NotificationTypeConfig> = {
    urgent_request: {
        label: "Demande urgente",
        icon: AlertOctagon,
        badgeCls: "text-rose-700 dark:text-rose-300",
        iconCls: "text-rose-600 dark:text-rose-400",
        target: "/workspace/rh/actions?tab=requests&requestStatus=pending",
    },
    talent_at_risk: {
        label: "Talent à risque",
        icon: UserX,
        badgeCls: "text-orange-700 dark:text-orange-300",
        iconCls: "text-orange-600 dark:text-orange-400",
        target: (n) =>
            n.talent_id || n.entity_id
                ? `/workspace/rh/employees?talentId=${encodeURIComponent(String(n.talent_id ?? n.entity_id))}`
                : "/workspace/rh/employees",
    },
    contract_ending: {
        label: "Fin de mission",
        icon: CalendarX,
        badgeCls: "text-amber-700 dark:text-amber-300",
        iconCls: "text-amber-600 dark:text-amber-400",
        target: (n) => {
            const tid = n.talent_id ?? n.metadata?.talent_id ?? n.entity_id;
            return tid
                ? `/workspace/rh/employees?talentId=${encodeURIComponent(String(tid))}`
                : "/workspace/rh/employees";
        },
    },
    skill_gap_critical: {
        label: "Écart compétences",
        icon: AlertTriangle,
        badgeCls: "text-purple-700 dark:text-purple-300",
        iconCls: "text-purple-600 dark:text-purple-400",
        target: (n) =>
            n.entity_id
                ? `/workspace/rh/actions?tab=matching&project=${encodeURIComponent(String(n.entity_id))}`
                : "/workspace/rh/actions?tab=matching",
    },
    budget_overrun: {
        label: "Dépassement budget",
        icon: TrendingUp,
        badgeCls: "text-red-700 dark:text-red-300",
        iconCls: "text-red-600 dark:text-red-400",
        target: (n) =>
            n.entity_id
                ? `/workspace/rh/projects-budget?project=${encodeURIComponent(String(n.entity_id))}`
                : "/workspace/rh/projects-budget",
    },
};

export const NOTIFICATION_TYPE_DEFAULT: NotificationTypeConfig = {
    label: "Notification",
    icon: Bell,
    badgeCls: "text-ws-secondary",
    iconCls: "text-ws-muted",
    target: "/workspace/rh/notifications",
};

export const SEVERITY_CONFIG: Record<NotificationSeverity, SeverityConfig> = {
    critical: {
        label: "Critique",
        badgeCls:
            "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900",
        dotCls: "bg-rose-500",
        borderCls: "border-l-rose-500",
        pulse: true,
    },
    high: {
        label: "Élevée",
        badgeCls:
            "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-100 dark:border-orange-900",
        dotCls: "bg-orange-500",
        borderCls: "border-l-orange-500",
    },
    medium: {
        label: "Moyenne",
        badgeCls:
            "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900",
        dotCls: "bg-amber-500",
        borderCls: "border-l-amber-500",
    },
    low: {
        label: "Basse",
        badgeCls:
            "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900",
        dotCls: "bg-emerald-500",
        borderCls: "border-l-emerald-500",
    },
};

export function getNotificationTypeConfig(type: NotificationType | string): NotificationTypeConfig {
    const key = String(type ?? "").trim();
    return NOTIFICATION_TYPE_CONFIG[key] ?? NOTIFICATION_TYPE_DEFAULT;
}

export function getSeverityConfig(severity: NotificationSeverity): SeverityConfig {
    return SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.medium;
}

export function resolveNotificationTarget(n: RhNotification): string {
    const cfg = getNotificationTypeConfig(n.type);
    return typeof cfg.target === "function" ? cfg.target(n) : cfg.target;
}

export function formatNotificationMetadata(metadata: Record<string, unknown> | null): { key: string; value: string }[] {
    if (!metadata || !Object.keys(metadata).length) return [];
    return Object.entries(metadata)
        .filter(([, v]) => v != null && String(v).trim() !== "")
        .slice(0, 12)
        .map(([key, value]) => ({
            key: key.replace(/_/g, " "),
            value: typeof value === "object" ? JSON.stringify(value) : String(value),
        }));
}
