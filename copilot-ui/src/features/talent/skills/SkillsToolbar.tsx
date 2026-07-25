import { LayoutGrid, ListTree, Search } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { SkillsTabs } from "./SkillsTabs";
import type { SkillsViewMode } from "./talent-skills-ui";
import type { SkillsTab } from "@/types/talent-skills";
import { TALENT_SEGMENT_ACTIVE, TALENT_SEGMENT_IDLE, TALENT_SEGMENTED } from "@/components/talent/ui/talent-workspace-ui";
import { cx } from "@/utils/cx";

export const SKILLS_ADD_ANCHOR_ID = "skills-add-anchor";

type SkillsToolbarProps = {
    tab: SkillsTab;
    mineCount?: number;
    gapsCount?: number;
    onTabChange: (tab: SkillsTab) => void;
    /** Onglet Mes compétences */
    viewMode?: SkillsViewMode;
    onViewModeChange?: (mode: SkillsViewMode) => void;
    searchQuery?: string;
    onSearchChange?: (value: string) => void;
    onAddClick?: () => void;
};

export function SkillsToolbar({
    tab,
    mineCount,
    gapsCount,
    onTabChange,
    viewMode = "grid",
    onViewModeChange,
    searchQuery = "",
    onSearchChange,
    onAddClick,
}: SkillsToolbarProps) {
    const showMineControls = tab === "mine";

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <SkillsTabs tab={tab} mineCount={mineCount} gapsCount={gapsCount} onTabChange={onTabChange} />

                {showMineControls && onViewModeChange ? (
                    <div className={TALENT_SEGMENTED} role="group" aria-label="Mode d'affichage">
                        <button
                            type="button"
                            aria-pressed={viewMode === "grid"}
                            onClick={() => onViewModeChange("grid")}
                            className={cx(
                                "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition",
                                viewMode === "grid" ? TALENT_SEGMENT_ACTIVE : TALENT_SEGMENT_IDLE,
                            )}
                        >
                            <LayoutGrid className="size-3.5" aria-hidden />
                            Grille
                        </button>
                        <button
                            type="button"
                            aria-pressed={viewMode === "category"}
                            onClick={() => onViewModeChange("category")}
                            className={cx(
                                "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition",
                                viewMode === "category" ? TALENT_SEGMENT_ACTIVE : TALENT_SEGMENT_IDLE,
                            )}
                        >
                            <ListTree className="size-3.5" aria-hidden />
                            Par catégorie
                        </button>
                    </div>
                ) : null}
            </div>

            {showMineControls ? (
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[12rem] flex-1">
                        <label htmlFor="skills-search" className="sr-only">
                            Rechercher une compétence
                        </label>
                        <Search
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary"
                            aria-hidden
                        />
                        <input
                            id="skills-search"
                            type="search"
                            value={searchQuery}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            placeholder="Rechercher par nom…"
                            className="w-full rounded-lg border border-secondary bg-primary py-2 pl-9 pr-3 text-sm text-primary outline-none placeholder:text-placeholder focus:border-brand-secondary dark:border-secondary"
                        />
                    </div>
                    <span id={SKILLS_ADD_ANCHOR_ID}>
                        <Button type="button" color="secondary" size="sm" onClick={onAddClick}>
                            Ajouter une compétence
                        </Button>
                    </span>
                </div>
            ) : null}
        </div>
    );
}
