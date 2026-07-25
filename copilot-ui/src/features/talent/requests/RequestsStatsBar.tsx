import { CheckCircle2, Clock3, Flame } from "lucide-react";
import type { TalentRequestsSummary } from "@/types/talent-requests";
import { cx } from "@/utils/cx";
import type { RequestsStatKey } from "./talent-requests-ui";

type RequestsStatsBarProps = {
    summary?: TalentRequestsSummary;
    isLoading?: boolean;
    activeStat?: RequestsStatKey | null;
    onStatClick?: (key: RequestsStatKey) => void;
};

type StatItem = {
    key: RequestsStatKey;
    icon: typeof Clock3;
    label: string;
    value: number;
    accent?: "amber";
};

export function RequestsStatsBar({
    summary,
    isLoading,
    activeStat = null,
    onStatClick,
}: RequestsStatsBarProps) {
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

    const pending = summary.by_status?.pending ?? 0;
    const accepted = summary.by_status?.accepted ?? 0;
    const urgent = summary.urgent ?? 0;

    const items: StatItem[] = [
        { key: "pending", icon: Clock3, label: "En attente", value: pending, accent: "amber" },
        { key: "accepted", icon: CheckCircle2, label: "Acceptées", value: accepted },
        { key: "urgent", icon: Flame, label: "Urgentes", value: urgent },
    ];

    return (
        <div
            className="flex divide-x divide-secondary/40 overflow-x-auto rounded-lg border border-secondary/60 bg-primary shadow-sm dark:divide-secondary/40 dark:border-secondary/60 dark:bg-primary"
            role="group"
            aria-label="Indicateurs demandes"
        >
            {items.map((item) => {
                const Icon = item.icon;
                const muted = item.value === 0;
                const pressed = activeStat === item.key;
                const interactive = typeof onStatClick === "function";

                const valueClass = muted
                    ? "text-quaternary"
                    : item.accent === "amber"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-primary";

                const content = (
                    <>
                        <div className="flex items-center gap-1.5">
                            <Icon
                                className={cx("size-3.5 shrink-0", muted ? "text-quaternary" : "text-quaternary")}
                                aria-hidden
                            />
                            <p
                                className={cx(
                                    "text-[10px] font-medium uppercase tracking-wider",
                                    muted ? "text-quaternary" : "text-tertiary",
                                )}
                            >
                                {item.label}
                            </p>
                        </div>
                        <div
                            className={cx(
                                "mt-0.5 text-base font-semibold tabular-nums leading-tight sm:text-lg",
                                valueClass,
                            )}
                        >
                            {item.value}
                        </div>
                    </>
                );

                if (!interactive) {
                    return (
                        <div key={item.key} className="min-w-[7.5rem] flex-1 px-3 py-2.5 sm:min-w-0">
                            {content}
                        </div>
                    );
                }

                return (
                    <button
                        key={item.key}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => onStatClick(item.key)}
                        className={cx(
                            "min-w-[7.5rem] flex-1 px-3 py-2.5 text-left transition sm:min-w-0",
                            "hover:bg-secondary/30 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-solid",
                            pressed && "bg-secondary/40",
                        )}
                    >
                        {content}
                    </button>
                );
            })}
        </div>
    );
}
