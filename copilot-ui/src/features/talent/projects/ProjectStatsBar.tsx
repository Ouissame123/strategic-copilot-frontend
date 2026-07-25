import { Archive, Calendar, Folder, Gauge } from "lucide-react";
import type { TalentProjectsSummary } from "@/types/talent-projects";
import { ALLOCATION_STATUS_LABELS_FR } from "./talent-projects-ui";
import { cx } from "@/utils/cx";

type ProjectStatsBarProps = {
    summary?: TalentProjectsSummary;
    isLoading?: boolean;
};

function AllocationMiniBar({ pct }: { pct: number }) {
    const clamped = Math.max(0, Math.min(100, pct));
    return (
        <span className="inline-flex items-center gap-2">
            <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-secondary" aria-hidden>
                <span
                    className="absolute inset-y-0 left-0 rounded-full bg-brand-secondary"
                    style={{ width: `${clamped}%` }}
                />
            </span>
            <span className="tabular-nums">{clamped}%</span>
        </span>
    );
}

export function ProjectStatsBar({ summary, isLoading }: ProjectStatsBarProps) {
    if (!summary && !isLoading) return null;

    if (isLoading || !summary) {
        return (
            <div className="flex divide-x divide-secondary/40 overflow-x-auto rounded-lg border border-secondary/60 bg-primary shadow-sm">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="min-w-[7.5rem] flex-1 px-3 py-2.5">
                        <div className="h-10 animate-pulse rounded-md bg-secondary/40" />
                    </div>
                ))}
            </div>
        );
    }

    const allocLabel = ALLOCATION_STATUS_LABELS_FR[summary.allocation_status] ?? summary.allocation_status;
    const items = [
        {
            key: "active",
            icon: Folder,
            label: "Actifs",
            value: String(summary.by_tab.active),
        },
        {
            key: "planned",
            icon: Calendar,
            label: "Planifiés",
            value: String(summary.by_tab.planned),
        },
        {
            key: "past",
            icon: Archive,
            label: "Passés",
            value: String(summary.by_tab.past),
        },
        {
            key: "allocation",
            icon: Gauge,
            label: "Allocation",
            value: (
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <AllocationMiniBar pct={summary.total_allocation_pct_active} />
                    <span className="text-xs font-medium text-tertiary">{allocLabel}</span>
                </span>
            ),
        },
    ] as const;

    return (
        <div
            className="flex divide-x divide-secondary/40 overflow-x-auto rounded-lg border border-secondary/60 bg-primary shadow-sm"
            role="group"
            aria-label="Indicateurs projets"
        >
            {items.map((item) => {
                const Icon = item.icon;
                return (
                    <div key={item.key} className="min-w-[7.5rem] flex-1 px-3 py-2.5 sm:min-w-0">
                        <div className="flex items-center gap-1.5">
                            <Icon className="size-3.5 shrink-0 text-quaternary" aria-hidden />
                            <p className="text-[10px] font-medium uppercase tracking-wider text-tertiary">{item.label}</p>
                        </div>
                        <div className={cx("mt-0.5 text-base font-semibold leading-tight text-primary sm:text-lg")}>
                            {item.value}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
