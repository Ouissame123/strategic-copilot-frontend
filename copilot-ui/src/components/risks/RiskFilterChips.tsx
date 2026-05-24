import { cx } from "@/utils/cx";
import type { RiskQuickFilterId } from "./risks-shared";

const FILTERS: { id: RiskQuickFilterId; label: string }[] = [
    { id: "my_projects", label: "🔥 Mes projets" },
    { id: "critical_only", label: "⚠️ Critiques seules" },
    { id: "today", label: "📅 Aujourd'hui" },
    { id: "talents", label: "👤 Talents" },
    { id: "projects", label: "📦 Projets" },
    { id: "watchdog_only", label: "🛡️ Watchdog uniquement" },
];

type RiskFilterChipsProps = {
    active: Set<RiskQuickFilterId>;
    onToggle: (id: RiskQuickFilterId) => void;
    className?: string;
};

export function RiskFilterChips({ active, onToggle, className }: RiskFilterChipsProps) {
    return (
        <div className={cx("flex flex-wrap gap-2", className)}>
            {FILTERS.map((f) => {
                const isOn = active.has(f.id);
                return (
                    <button
                        key={f.id}
                        type="button"
                        onClick={() => onToggle(f.id)}
                        className={cx(
                            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                            isOn
                                ? "border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-500/25"
                                : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-700 dark:hover:bg-violet-950/40",
                        )}
                    >
                        {f.label}
                    </button>
                );
            })}
        </div>
    );
}
