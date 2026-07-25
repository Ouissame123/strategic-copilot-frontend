import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTalentSkillsCatalog } from "@/hooks/useTalentSkills";
import type { CatalogSkill } from "@/types/talent-skills";
import { CatalogRow } from "./CatalogRow";
import { filterSkillsByName, groupByCategory } from "./talent-skills-ui";
import { TALENT_SEGMENT_ACTIVE, TALENT_SEGMENT_IDLE } from "@/components/talent/ui/talent-workspace-ui";
import { cx } from "@/utils/cx";

type CatalogListProps = {
    onAdd: (skill: CatalogSkill) => void;
};

export function CatalogList({ onAdd }: CatalogListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [hideAdded, setHideAdded] = useState(true);

    const catalogQuery = useTalentSkillsCatalog("", true);
    const items = catalogQuery.data ?? [];

    const filtered = useMemo(() => {
        let list = filterSkillsByName(items, searchQuery);
        if (hideAdded) list = list.filter((s) => !s.already_added);
        return list;
    }, [items, searchQuery, hideAdded]);

    const groups = useMemo(() => groupByCategory(filtered), [filtered]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[12rem] flex-1">
                    <label htmlFor="catalog-search" className="sr-only">
                        Rechercher dans le catalogue
                    </label>
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary"
                        aria-hidden
                    />
                    <input
                        id="catalog-search"
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher dans le catalogue…"
                        className="w-full rounded-lg border border-secondary bg-primary py-2 pl-9 pr-3 text-sm text-primary outline-none placeholder:text-placeholder focus:border-brand-secondary"
                    />
                </div>

                <button
                    type="button"
                    aria-pressed={hideAdded}
                    onClick={() => setHideAdded((v) => !v)}
                    className={cx(
                        "inline-flex items-center rounded-lg px-3 py-2 text-xs font-medium transition",
                        hideAdded ? TALENT_SEGMENT_ACTIVE : TALENT_SEGMENT_IDLE,
                        "ring-1 ring-secondary/60",
                    )}
                >
                    Masquer celles déjà ajoutées
                </button>
            </div>

            {catalogQuery.isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-11 animate-pulse rounded-lg bg-secondary" />
                    ))}
                </div>
            ) : null}

            {catalogQuery.isError ? (
                <p className="text-sm text-red-600 dark:text-red-400">Impossible de charger le catalogue.</p>
            ) : null}

            {!catalogQuery.isLoading && !catalogQuery.isError && filtered.length === 0 ? (
                <p className="text-sm text-tertiary">
                    {searchQuery.trim()
                        ? `Aucune compétence ne correspond à « ${searchQuery.trim()} »`
                        : hideAdded
                          ? "Aucune compétence disponible à ajouter."
                          : "Aucune compétence trouvée dans le catalogue."}
                </p>
            ) : null}

            {!catalogQuery.isLoading && !catalogQuery.isError && groups.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-secondary/60 bg-primary shadow-sm">
                    {groups.map((group) => (
                        <section key={group.category} aria-labelledby={`catalog-cat-${group.category}`}>
                            <h2
                                id={`catalog-cat-${group.category}`}
                                className="sticky top-0 z-10 border-b border-secondary/40 bg-primary/95 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-tertiary backdrop-blur-sm"
                            >
                                {group.category}
                                <span className="ml-2 font-medium tabular-nums text-quaternary">
                                    {group.items.length}
                                </span>
                            </h2>
                            <ul>
                                {group.items.map((skill) => (
                                    <CatalogRow key={skill.skill_id} skill={skill} onAdd={onAdd} />
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
