import { cx } from "@/utils/cx";
import type { ReportAudience } from "./reports-shared";

const FILTERS: { id: ReportAudience; label: string; emoji: string }[] = [
    { id: "all", label: "Tous", emoji: "✨" },
    { id: "direction", label: "Direction", emoji: "🏛️" },
    { id: "rh", label: "RH", emoji: "👥" },
    { id: "project", label: "Projet", emoji: "🎯" },
    { id: "risks", label: "Risques", emoji: "⚠️" },
];

type AudienceFiltersProps = {
    value: ReportAudience;
    onChange: (v: ReportAudience) => void;
};

export function AudienceFilters({ value, onChange }: AudienceFiltersProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
                <button
                    key={f.id}
                    type="button"
                    onClick={() => onChange(f.id)}
                    className={cx(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200",
                        value === f.id
                            ? "border-primary-600 bg-primary-50 text-primary-700 shadow-sm dark:border-primary-500 dark:bg-primary-950/40 dark:text-primary-300"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
                    )}
                >
                    <span aria-hidden>{f.emoji}</span>
                    {f.label}
                </button>
            ))}
        </div>
    );
}
