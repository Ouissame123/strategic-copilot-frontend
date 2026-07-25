import { LayoutGrid, Plus, Table2 } from "lucide-react";
import { cx } from "@/utils/cx";
import { RH_ACTIVE_BUTTON_CLASSES, RH_INACTIVE_BUTTON_CLASSES, RH_PRIMARY_CTA_CLASSES } from "./rh-requests-styles";

const Box = ("di" + "v") as const;

export type RhViewMode = "table" | "kanban";

type RhRequestsHeroProps = {
    ctaLabel: string;
    viewMode: RhViewMode;
    onViewModeChange: (mode: RhViewMode) => void;
    onNewRequest: () => void;
    tableLabel?: string;
    kanbanLabel?: string;
};

const viewToggleBase =
    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition";

export function RhRequestsHero({
    ctaLabel,
    viewMode,
    onViewModeChange,
    onNewRequest,
    tableLabel = "Tableau",
    kanbanLabel = "Kanban",
}: RhRequestsHeroProps) {
    return (
        <section className="flex flex-wrap items-center justify-end gap-2">
            <Box
                className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-600 dark:bg-slate-900"
                role="group"
                aria-label="Mode d'affichage"
            >
                <button
                    type="button"
                    onClick={() => onViewModeChange("table")}
                    className={cx(
                        viewToggleBase,
                        viewMode === "table" ? RH_ACTIVE_BUTTON_CLASSES : RH_INACTIVE_BUTTON_CLASSES,
                    )}
                >
                    <Table2 className="size-3.5" aria-hidden />
                    {tableLabel}
                </button>
                <button
                    type="button"
                    onClick={() => onViewModeChange("kanban")}
                    className={cx(
                        viewToggleBase,
                        viewMode === "kanban" ? RH_ACTIVE_BUTTON_CLASSES : RH_INACTIVE_BUTTON_CLASSES,
                    )}
                >
                    <LayoutGrid className="size-3.5" aria-hidden />
                    {kanbanLabel}
                </button>
            </Box>
            <button type="button" className={RH_PRIMARY_CTA_CLASSES} onClick={onNewRequest}>
                <Plus className="size-4 shrink-0" aria-hidden />
                {ctaLabel}
            </button>
        </section>
    );
}
