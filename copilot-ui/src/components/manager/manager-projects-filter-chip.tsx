export type FilterChipTone = "emerald" | "amber" | "rose" | "slate";

export function ManagerProjectsFilterChip({
    active,
    onClick,
    label,
    tone = "slate",
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    tone?: FilterChipTone;
}) {
    const toneActive: Record<FilterChipTone, string> = {
        emerald: "bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-700",
        amber: "bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-950/45 dark:text-amber-100 dark:ring-amber-700",
        rose: "bg-rose-100 text-rose-800 ring-rose-300 dark:bg-rose-950/45 dark:text-rose-100 dark:ring-rose-700",
        slate: "bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-200",
    };
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-2.5 py-1 text-xs ring-1 transition-colors ${
                active
                    ? toneActive[tone]
                    : "bg-primary text-secondary ring-secondary hover:bg-secondary_subtle dark:ring-secondary"
            }`}
        >
            {label}
        </button>
    );
}
