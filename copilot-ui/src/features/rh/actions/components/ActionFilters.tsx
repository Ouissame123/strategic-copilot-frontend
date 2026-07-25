import type { RhActionFilterId } from "../types";
import {
    TRIAGE_TYPE_PILL_ACTIVE,
    TRIAGE_TYPE_PILL_IDLE,
} from "@/components/manager/inbox-triage";
import { cx } from "@/utils/cx";

export type ActionFilterCounts = Record<RhActionFilterId, number>;

const FILTERS: { id: RhActionFilterId; label: string }[] = [
    { id: "all", label: "Toutes" },
    { id: "urgent", label: "Urgentes" },
    { id: "reallocation", label: "Réaffectations" },
    { id: "pending", label: "En attente" },
];

type ActionFiltersProps = {
    value: RhActionFilterId;
    onChange: (next: RhActionFilterId) => void;
    counts: ActionFilterCounts;
};

export function ActionFilters({ value, onChange, counts }: ActionFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filtres triage actions">
            {FILTERS.map((f) => {
                const active = value === f.id;
                const count = counts[f.id];
                return (
                    <button
                        key={f.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(f.id)}
                        className={cx(
                            "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary",
                            active ? TRIAGE_TYPE_PILL_ACTIVE : TRIAGE_TYPE_PILL_IDLE,
                        )}
                    >
                        {f.label}
                        {f.id === "all" || count > 0 ? (
                            <span className="ml-1 tabular-nums text-tertiary">({count})</span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}

export function matchesActionFilter(
    filter: RhActionFilterId,
    action: { priority: string; type: string; statusBucket: string | null },
): boolean {
    if (filter === "all") return true;
    if (filter === "urgent") return action.priority.toLowerCase() === "urgent";
    if (filter === "pending") return action.statusBucket === "pending";
    if (filter === "reallocation") {
        const t = action.type.toLowerCase();
        return t === "reallocation" || t === "réaffectation" || t === "reaffectation";
    }
    return true;
}
