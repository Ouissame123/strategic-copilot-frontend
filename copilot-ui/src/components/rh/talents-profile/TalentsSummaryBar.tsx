import type { LucideIcon } from "lucide-react";
import { KeyRound, UserCheck, Users, UserX } from "lucide-react";
import type { TalentsListSummary } from "@/types/rh-talents-profile.types";
import { cx } from "@/utils/cx";

type TalentsSummaryBarProps = {
    summary?: TalentsListSummary;
    loading?: boolean;
};

function Kpi({
    label,
    value,
    icon: Icon,
    tone = "neutral",
}: {
    label: string;
    value: number;
    icon: LucideIcon;
    tone?: "neutral" | "success" | "warning" | "info";
}) {
    const toneCls = {
        neutral: "bg-ws-card text-ws-primary",
        success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
        warning: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
        info: "bg-primary-50 text-primary-800 dark:bg-primary-950/40 dark:text-primary-200",
    }[tone];

    return (
        <div className={cx("flex flex-col items-center justify-center gap-1 px-3 py-3", toneCls)}>
            <Icon className="size-3.5 opacity-60" aria-hidden />
            <span className="text-lg font-semibold tabular-nums font-kpi-mono">{value}</span>
            <span className="text-center text-[11px] text-ws-muted">{label}</span>
        </div>
    );
}

export function TalentsSummaryBar({ summary, loading }: TalentsSummaryBarProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ws-border-subtle bg-ws-border sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse bg-ws-muted-surface" />
                ))}
            </div>
        );
    }

    const portalPct = summary?.total ? Math.round((summary.with_portal / summary.total) * 100) : 0;

    return (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ws-border-subtle bg-ws-border sm:grid-cols-4">
            <Kpi label="Total" value={summary?.total ?? 0} icon={Users} />
            <Kpi label="Avec manager" value={summary?.with_manager ?? 0} icon={UserCheck} tone="success" />
            <Kpi
                label="Sans manager"
                value={summary?.without_manager ?? 0}
                icon={UserX}
                tone={summary && summary.without_manager > 0 ? "warning" : "neutral"}
            />
            <Kpi label={`Portail (${portalPct}%)`} value={summary?.with_portal ?? 0} icon={KeyRound} tone="info" />
        </div>
    );
}
