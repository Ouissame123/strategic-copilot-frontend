import { Button } from "@/components/base/buttons/button";
import {
    RequestFilters,
    RH_REQUEST_PRIORITY_FILTER_OPTIONS,
    RH_REQUEST_TYPE_FILTER_OPTIONS,
    type RhRequestPriorityFilter,
} from "@/components/rh-requests/manager-requests/RequestFilters";
import { getRequestTypeLabel } from "@/lib/rh-request-display";
import { cx } from "@/utils/cx";

type InboxFiltersProps = {
    search: string;
    onSearchChange: (v: string) => void;
    type: string;
    onTypeChange: (v: string) => void;
    priority: RhRequestPriorityFilter;
    onPriorityChange: (v: RhRequestPriorityFilter) => void;
    project: string;
    onProjectChange: (v: string) => void;
    projectOptions: { id: string; name: string }[];
    onReset: () => void;
    searchInputRef?: React.RefObject<HTMLInputElement | null>;
};

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-ws-border bg-ws-muted-surface px-2 py-0.5 text-xs text-ws-secondary">
            {label}
            <button
                type="button"
                aria-label={`Retirer filtre ${label}`}
                onClick={onRemove}
                className="rounded-full px-0.5 hover:bg-ws-subtle"
            >
                ×
            </button>
        </span>
    );
}

export function InboxFilters(props: InboxFiltersProps) {
    const { type, onTypeChange, priority, onPriorityChange, project, onProjectChange, projectOptions, onReset } =
        props;

    const activePills: { key: string; label: string; clear: () => void }[] = [];

    if (type !== "all") {
        const opt = RH_REQUEST_TYPE_FILTER_OPTIONS.find((o) => o.value === type);
        activePills.push({
            key: "type",
            label: `Type: ${getRequestTypeLabel(type, opt?.label)}`,
            clear: () => onTypeChange("all"),
        });
    }
    if (priority !== "all") {
        const opt = RH_REQUEST_PRIORITY_FILTER_OPTIONS.find((o) => o.value === priority);
        activePills.push({
            key: "priority",
            label: `Priorité: ${opt?.label ?? priority}`,
            clear: () => onPriorityChange("all"),
        });
    }
    if (project !== "all") {
        const name = projectOptions.find((p) => p.id === project)?.name ?? project;
        activePills.push({
            key: "project",
            label: `Projet: ${name}`,
            clear: () => onProjectChange("all"),
        });
    }

    return (
        <div className="space-y-2">
            <RequestFilters {...props} />
            {activePills.length > 0 ? (
                <div className={cx("flex flex-wrap items-center gap-2")}>
                    {activePills.map((pill) => (
                        <FilterPill key={pill.key} label={pill.label} onRemove={pill.clear} />
                    ))}
                    <Button color="tertiary" size="sm" onPress={onReset}>
                        Tout effacer
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
