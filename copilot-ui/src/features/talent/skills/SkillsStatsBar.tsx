import { Award, Clock, Gauge, Layers } from "lucide-react";
import type { ReactNode } from "react";
import type { SkillsSummary } from "@/types/talent-skills";
import { formatAvgLevel } from "./talent-skills-ui";
import { cx } from "@/utils/cx";

type SkillsStatsBarProps = {
    summary?: SkillsSummary;
    isLoading?: boolean;
    onAddCertifiedClick?: () => void;
};

type StatItem = {
    key: string;
    icon: typeof Layers;
    label: string;
    value: ReactNode;
    muted: boolean;
    extra: ReactNode;
};

export function SkillsStatsBar({ summary, isLoading, onAddCertifiedClick }: SkillsStatsBarProps) {
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

    const certifiedZero = summary.certified === 0;
    const avgLabel = formatAvgLevel(summary.avg_level);

    const items: StatItem[] = [
        {
            key: "total",
            icon: Layers,
            label: "Compétences",
            value: <span className="tabular-nums">{summary.total}</span>,
            muted: false,
            extra: null,
        },
        {
            key: "certified",
            icon: Award,
            label: "Certifiées",
            value: <span className="tabular-nums">{summary.certified}</span>,
            muted: certifiedZero,
            extra: certifiedZero ? (
                <button
                    type="button"
                    onClick={onAddCertifiedClick}
                    className="mt-0.5 text-[11px] font-medium text-brand-secondary underline-offset-2 hover:underline"
                >
                    En ajouter
                </button>
            ) : null,
        },
        {
            key: "avg",
            icon: Gauge,
            label: "Niveau moyen",
            value: <span className="tabular-nums">{avgLabel}</span>,
            muted: false,
            extra: null,
        },
        {
            key: "recent",
            icon: Clock,
            label: "Utilisées récemment",
            value: (
                <span className="tabular-nums">
                    {summary.recently_used}/{summary.total}
                </span>
            ),
            muted: false,
            extra: null,
        },
    ];

    return (
        <div
            className="flex divide-x divide-secondary/40 overflow-x-auto rounded-lg border border-secondary/60 bg-primary shadow-sm"
            role="group"
            aria-label="Indicateurs compétences"
        >
            {items.map((item) => {
                const Icon = item.icon;
                return (
                    <div key={item.key} className="min-w-[7.5rem] flex-1 px-3 py-2.5 sm:min-w-0">
                        <div className="flex items-center gap-1.5">
                            <Icon className="size-3.5 shrink-0 text-quaternary" aria-hidden />
                            <p
                                className={cx(
                                    "text-[10px] font-medium uppercase tracking-wider",
                                    item.muted ? "text-quaternary" : "text-tertiary",
                                )}
                            >
                                {item.label}
                            </p>
                        </div>
                        <div
                            className={cx(
                                "mt-0.5 text-base font-semibold leading-tight sm:text-lg",
                                item.muted ? "text-quaternary" : "text-primary",
                            )}
                        >
                            {item.value}
                        </div>
                        {item.extra}
                    </div>
                );
            })}
        </div>
    );
}
