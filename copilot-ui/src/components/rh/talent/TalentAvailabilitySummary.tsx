/**
 * Résumé disponibilité — carte liste talents RH.
 */
import { Briefcase } from "lucide-react";
import {
    formatAvailabilityPct,
    formatPlannedLoadPct,
    hasAvailabilityPct,
    resolveAvailabilityBadgeMeta,
} from "@/lib/rh-availability-display";
import type { RhTalentAvailabilitySummary } from "@/types/rh-availability.types";
import { RH_TEXT_MUTED, RH_TEXT_PRIMARY, WS_MUTED_SURFACE } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type TalentAvailabilitySummaryProps = {
    availability?: RhTalentAvailabilitySummary | null;
    fallbackLoadPct?: number;
    fallbackAvailablePct?: number | null;
    fallbackProjectsCount?: number;
    /** Mode compact pour cartes liste */
    compact?: boolean;
};

function loadBarColor(pct: number): string {
    if (pct >= 100) return "bg-rose-500";
    if (pct >= 80) return "bg-amber-400";
    if (pct > 0) return "bg-emerald-500";
    return "bg-slate-300 dark:bg-slate-600";
}

export function TalentAvailabilitySummary({
    availability,
    fallbackLoadPct = 0,
    fallbackAvailablePct,
    fallbackProjectsCount = 0,
    compact = false,
}: TalentAvailabilitySummaryProps) {
    const availableRaw = availability?.available_pct ?? fallbackAvailablePct;
    const hasAvailability = hasAvailabilityPct(availableRaw);

    const activeLoad = availability?.active_load_pct ?? fallbackLoadPct ?? 0;
    const availablePct = hasAvailability ? Number(availableRaw) : 0;
    const projectsCount = availability?.active_projects_count ?? fallbackProjectsCount ?? 0;

    const badgeMeta = resolveAvailabilityBadgeMeta({
        availabilityStatus: availability?.availability_status,
        currentLoadPct: activeLoad,
        availablePct: availableRaw,
        preferApiStatus: Boolean(availability?.talent_id && availability?.availability_status),
    });

    const plannedDisplay = formatPlannedLoadPct(availability?.planned_load_pct, hasAvailability);

    if (!hasAvailability) {
        return (
            <div
                className={cx(
                    "rounded-md border border-dashed border-slate-200 px-2 py-1 text-[10px]",
                    RH_TEXT_MUTED,
                    compact && "mt-0",
                )}
            >
                Disponibilité non calculée
            </div>
        );
    }

    if (compact) {
        return (
            <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span
                        className={cx(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                            badgeMeta.badgeCls,
                        )}
                    >
                        <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", badgeMeta.dotCls)} aria-hidden />
                        {badgeMeta.label}
                    </span>
                    <span className={cx("text-[10px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400")}>
                        {formatAvailabilityPct(availablePct)} dispo.
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className={cx(
                            "h-2 flex-1 overflow-hidden rounded-full ring-1 ring-inset ring-slate-200/80 dark:ring-slate-600/80",
                            WS_MUTED_SURFACE,
                        )}
                    >
                        <div
                            className={cx("h-full rounded-full shadow-sm transition-[width]", loadBarColor(activeLoad))}
                            style={{ width: `${Math.min(100, Math.max(0, activeLoad))}%` }}
                        />
                    </div>
                    <span className={cx("shrink-0 text-[9px] font-semibold tabular-nums", RH_TEXT_PRIMARY)}>
                        {formatAvailabilityPct(activeLoad)}
                    </span>
                </div>
                <div className={cx("flex items-center justify-between gap-2 text-[9px]", RH_TEXT_MUTED)}>
                    <span>
                        Plan. <span className={cx("font-medium tabular-nums", RH_TEXT_PRIMARY)}>{plannedDisplay}</span>
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                        <Briefcase size={9} aria-hidden />
                        {projectsCount} proj.
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2.5 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
                <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", badgeMeta.badgeCls)}>
                    <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", badgeMeta.dotCls)} aria-hidden />
                    {badgeMeta.label}
                </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                <div>
                    <div className={RH_TEXT_MUTED}>Charge active</div>
                    <div className={cx("font-semibold tabular-nums", RH_TEXT_PRIMARY)}>{formatAvailabilityPct(activeLoad)}</div>
                </div>
                <div>
                    <div className={RH_TEXT_MUTED}>Planifiée</div>
                    <div className={cx("font-semibold tabular-nums", RH_TEXT_PRIMARY)}>{plannedDisplay}</div>
                </div>
                <div>
                    <div className={RH_TEXT_MUTED}>Disponible</div>
                    <div className={cx("font-semibold tabular-nums text-emerald-600 dark:text-emerald-400")}>
                        {formatAvailabilityPct(availablePct)}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className={cx("h-1.5 flex-1 overflow-hidden rounded-full", WS_MUTED_SURFACE)}>
                    <div
                        className={cx("h-full rounded-full", loadBarColor(activeLoad))}
                        style={{ width: `${Math.min(100, Math.max(0, activeLoad))}%` }}
                    />
                </div>
                <span className={cx("flex shrink-0 items-center gap-0.5 text-[10px]", RH_TEXT_MUTED)}>
                    <Briefcase size={10} aria-hidden />
                    {projectsCount} projet{projectsCount !== 1 ? "s" : ""}
                </span>
            </div>
        </div>
    );
}
