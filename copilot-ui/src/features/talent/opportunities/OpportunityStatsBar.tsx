import { ArrowUpRight, RefreshCw, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { OpportunitiesSummary } from "@/types/talent-opportunities";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";
import { badgeToneClass, formatOpportunityScore, resolveScoreBadge } from "./talent-opportunities-ui";

type OpportunityStatsBarProps = {
    summary?: OpportunitiesSummary;
    isLoading?: boolean;
};

type StatsItem = {
    key: string;
    icon: typeof Sparkles;
    label: string;
    value: string;
    muted: boolean;
    tooltip?: string;
    valueNode?: ReactNode;
};

export function OpportunityStatsBar({ summary, isLoading }: OpportunityStatsBarProps) {
    if (!summary && !isLoading) return null;

    if (isLoading || !summary) {
        return (
            <div className="flex divide-x divide-secondary/40 overflow-x-auto rounded-lg border border-secondary/60 bg-primary shadow-sm dark:divide-secondary/40 dark:border-secondary/60 dark:bg-primary">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="min-w-[7.5rem] flex-1 px-3 py-2.5">
                        <div className="h-10 animate-pulse rounded-md bg-secondary/40" />
                    </div>
                ))}
            </div>
        );
    }

    const excellentCount = summary.by_tier.excellent;
    const excellentMuted = excellentCount === 0;
    const topBadge = resolveScoreBadge(summary.top_score);
    const redeployCount = summary.by_recommendation.redeploy;

    const items: StatsItem[] = [
        {
            key: "excellent",
            icon: Sparkles,
            label: "Excellents",
            value: String(excellentCount),
            muted: excellentMuted,
            tooltip: "Opportunités avec un score ≥ 8.5",
        },
        {
            key: "top",
            icon: ArrowUpRight,
            label: "Top score",
            value: formatOpportunityScore(summary.top_score),
            muted: false,
            valueNode: (
                <span className={cx("shrink-0", badgeToneClass(topBadge.tone))}>
                    {formatOpportunityScore(summary.top_score)}
                </span>
            ),
        },
        {
            key: "redeploy",
            icon: RefreshCw,
            label: "Redéploiements internes",
            value: String(redeployCount),
            muted: false,
        },
    ];

    return (
        <div
            className="flex divide-x divide-secondary/40 overflow-x-auto rounded-lg border border-secondary/60 bg-primary shadow-sm dark:divide-secondary/40 dark:border-secondary/60 dark:bg-primary"
            role="group"
            aria-label="Indicateurs opportunités"
        >
            {items.map((item) => {
                const Icon = item.icon;
                const content = (
                    <>
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
                            {item.valueNode ?? item.value}
                        </div>
                    </>
                );

                if (item.tooltip) {
                    return (
                        <Tooltip key={item.key} title={item.tooltip} delay={300}>
                            <TooltipTrigger
                                className={cx(
                                    "min-w-[7.5rem] flex-1 cursor-help px-3 py-2.5 text-left outline-hidden sm:min-w-0",
                                )}
                            >
                                {content}
                            </TooltipTrigger>
                        </Tooltip>
                    );
                }

                return (
                    <div key={item.key} className="min-w-[7.5rem] flex-1 px-3 py-2.5 sm:min-w-0">
                        {content}
                    </div>
                );
            })}
        </div>
    );
}
