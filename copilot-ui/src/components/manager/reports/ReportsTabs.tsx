import { BarChart3, Clock, Zap } from "lucide-react";
import { cx } from "@/utils/cx";

export type ReportsTabId = "generation" | "history" | "automation";

const TABS: { id: ReportsTabId; label: string; icon: typeof BarChart3; badgeKey: keyof TabCounts }[] = [
    { id: "generation", label: "Génération", icon: BarChart3, badgeKey: "generation" },
    { id: "history", label: "Historique", icon: Clock, badgeKey: "history" },
    { id: "automation", label: "Automatisation", icon: Zap, badgeKey: "automation" },
];

export type TabCounts = {
    generation: number;
    history: number;
    automation: number;
};

type ReportsTabsProps = {
    active: ReportsTabId;
    counts: TabCounts;
    onChange: (id: ReportsTabId) => void;
};

export function ReportsTabs({ active, counts, onChange }: ReportsTabsProps) {
    return (
        <div className="sticky top-0 z-20 -mx-1 border-b border-slate-200/60 bg-slate-50/95 px-1 pb-3 pt-1 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
            <div
                className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/80 p-1 dark:border-slate-800 dark:bg-slate-900/80"
                role="tablist"
            >
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = active === tab.id;
                    const count = counts[tab.badgeKey];
                    const showBadge = count > 0;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => onChange(tab.id)}
                            className={cx(
                                "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md"
                                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
                            )}
                        >
                            <Icon className="size-4" aria-hidden />
                            <span>{tab.label}</span>
                            {showBadge ? (
                                <span
                                    className={cx(
                                        "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                                    )}
                                >
                                    {count}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
