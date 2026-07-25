import type { ValidationTier } from "@/services/validations.api";
import { cx } from "@/utils/cx";

export type ValidationTierFilter = ValidationTier | "all";

type PillDef = {
    id: ValidationTierFilter;
    label: string;
    value: number;
    bg: string;
    border: string;
    text: string;
};

type ValidationTierPillsProps = {
    total: number;
    conflict: number;
    missingJustification: number;
    standard: number;
    active: ValidationTierFilter;
    onChange: (next: ValidationTierFilter) => void;
};

/** Pastilles compteurs — ordre mockup strict, filtre exclusif. */
export function ValidationTierPills({
    total,
    conflict,
    missingJustification,
    standard,
    active,
    onChange,
}: ValidationTierPillsProps) {
    const pills: PillDef[] = [
        {
            id: "conflict",
            label: "Conflits",
            value: conflict,
            bg: "#fef2f2",
            border: "#fecaca",
            text: "#991b1b",
        },
        {
            id: "missing_justification",
            label: "Justification manquante",
            value: missingJustification,
            bg: "#fffbeb",
            border: "#fde68a",
            text: "#92400e",
        },
        {
            id: "standard",
            label: "Standard",
            value: standard,
            bg: "#f3f4f6",
            border: "#e5e7eb",
            text: "#374151",
        },
        {
            id: "all",
            label: "Tout afficher",
            value: total,
            bg: "#eff6ff",
            border: "#bfdbfe",
            text: "#1e40af",
        },
    ];

    return (
        <div className="flex flex-wrap gap-3" role="group" aria-label="Filtrer par priorité">
            {pills.map((pill) => {
                const isActive = active === pill.id;
                return (
                    <button
                        key={pill.id}
                        type="button"
                        onClick={() => onChange(pill.id)}
                        aria-pressed={isActive}
                        className={cx(
                            "min-w-[7.5rem] flex-1 rounded-xl border px-4 py-3 text-left transition sm:flex-none",
                            isActive ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-950" : "opacity-90 hover:opacity-100",
                        )}
                        style={{
                            backgroundColor: pill.bg,
                            borderColor: pill.border,
                            color: pill.text,
                        }}
                    >
                        <div className="text-[22px] font-bold leading-none tabular-nums">{pill.value}</div>
                        <div className="mt-1.5 text-[12px] font-semibold leading-tight">{pill.label}</div>
                    </button>
                );
            })}
        </div>
    );
}
