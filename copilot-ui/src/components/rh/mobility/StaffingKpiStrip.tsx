import { UserCheck, UserMinus, Users } from "lucide-react";
import { MOBILITY_SURFACE } from "@/components/rh/mobility/mobility-board-theme";
import { RH_TEXT_MUTED, RH_TEXT_PRIMARY, WS_TEXT_FAINT } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

type MetricProps = {
    label: string;
    value: string;
    tone?: "neutral" | "success" | "warn";
    icon: React.ReactNode;
};

function Metric({ label, value, tone = "neutral", icon }: MetricProps) {
    const valueCls =
        tone === "success"
            ? "text-emerald-600 dark:text-emerald-400"
            : tone === "warn"
              ? "text-amber-600 dark:text-amber-400"
              : RH_TEXT_PRIMARY;

    return (
        <div className="flex-1 px-4 py-3">
            <div className="flex items-center gap-2">
                <span className="text-slate-400 dark:text-slate-500">{icon}</span>
                <span className={cx("text-[11px] font-medium", WS_TEXT_FAINT)}>{label}</span>
            </div>
            <p className={cx("mt-1 text-2xl font-semibold tabular-nums tracking-tight", valueCls)}>{value}</p>
        </div>
    );
}

export type StaffingKpiStripProps = {
    total: number;
    withManager: number;
    withoutManager: number;
    loading?: boolean;
};

export function StaffingKpiStrip({ total, withManager, withoutManager, loading }: StaffingKpiStripProps) {
    if (loading) {
        return (
            <div className={cx(MOBILITY_SURFACE, "flex h-[72px] animate-pulse items-center gap-4 px-4")}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 flex-1 rounded-lg bg-slate-100 dark:bg-slate-800" />
                ))}
            </div>
        );
    }

    return (
        <div className={cx(MOBILITY_SURFACE, "overflow-hidden")}>
            <div className="flex flex-col divide-y divide-slate-100 sm:flex-row sm:divide-x sm:divide-y-0 dark:divide-slate-800">
                <Metric label="Talents suivis" value={String(total)} icon={<Users size={14} aria-hidden />} />
                <Metric
                    label="Affectés à un manager"
                    value={String(withManager)}
                    tone="success"
                    icon={<UserCheck size={14} aria-hidden />}
                />
                <Metric
                    label="Sans manager"
                    value={String(withoutManager)}
                    tone={withoutManager > 0 ? "warn" : "neutral"}
                    icon={<UserMinus size={14} aria-hidden />}
                />
            </div>
        </div>
    );
}
