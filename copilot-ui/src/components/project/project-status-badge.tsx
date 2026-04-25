import {
    AlertCircle,
    AlertTriangle,
    Calendar,
    CheckCircle,
    Clock,
    FileCheck02,
    XCircle,
} from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { normalizeProjectStatus } from "@/pages/projects/projects-utils";

const KNOWN_STATUSES = ["active", "at-risk", "paused", "planned", "completed", "cancelled"] as const;

const statusConfig: Record<
    string,
    { Icon: typeof CheckCircle; iconClass: string; ring: string; bg: string }
> = {
    active: {
        Icon: CheckCircle,
        iconClass: "text-success-primary",
        ring: "ring-success-primary/35",
        bg: "bg-success-primary/10",
    },
    "at-risk": {
        Icon: AlertTriangle,
        iconClass: "text-warning-primary",
        ring: "ring-warning-primary/40",
        bg: "bg-warning-primary/10",
    },
    paused: {
        Icon: Clock,
        iconClass: "text-fg-quaternary",
        ring: "ring-secondary/50",
        bg: "bg-secondary/40",
    },
    completed: {
        Icon: FileCheck02,
        iconClass: "text-utility-brand-600 dark:text-utility-brand-300",
        ring: "ring-utility-brand-400/40",
        bg: "bg-utility-brand-50/80 dark:bg-utility-brand-950/40",
    },
    planned: {
        Icon: Calendar,
        iconClass: "text-utility-brand-700 dark:text-utility-brand-200",
        ring: "ring-utility-brand-300/50",
        bg: "bg-utility-brand-50/90 dark:bg-utility-brand-950/35",
    },
    cancelled: {
        Icon: XCircle,
        iconClass: "text-fg-quaternary",
        ring: "ring-fg-quaternary/30",
        bg: "bg-fg-quaternary/10",
    },
    default: {
        Icon: AlertCircle,
        iconClass: "text-tertiary",
        ring: "ring-secondary/50",
        bg: "bg-secondary/30",
    },
};

function resolveStatusKey(raw: string | null | undefined): keyof typeof statusConfig {
    const n = normalizeProjectStatus(String(raw ?? ""));
    if (KNOWN_STATUSES.includes(n as (typeof KNOWN_STATUSES)[number])) return n as keyof typeof statusConfig;
    return "default";
}

type ProjectStatusBadgeProps = {
    status: string | null | undefined;
    className?: string;
};

/**
 * Pastille de statut projet avec icône distinctive (scan visuel rapide).
 */
export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
    const { t } = useTranslation("portfolio");
    const key = resolveStatusKey(status);
    const { Icon, iconClass, ring, bg } = statusConfig[key];

    const labelKey = normalizeProjectStatus(String(status ?? ""));
    const statusLabelMap: Record<(typeof KNOWN_STATUSES)[number], string> = {
        active: t("status.active"),
        "at-risk": t("status.at-risk"),
        paused: t("status.paused"),
        planned: t("status.planned"),
        completed: t("status.completed"),
        cancelled: t("status.cancelled"),
    };
    const label = KNOWN_STATUSES.includes(labelKey as (typeof KNOWN_STATUSES)[number])
        ? statusLabelMap[labelKey as (typeof KNOWN_STATUSES)[number]]
        : String(status ?? "—");

    return (
        <span
            className={cx(
                "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                bg,
                ring,
                iconClass,
                className,
            )}
        >
            <Icon className="size-3.5 shrink-0 opacity-95" aria-hidden />
            <span className="min-w-0 truncate text-primary">{label}</span>
        </span>
    );
}
