import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { useTalentSkillsCatalog } from "@/hooks/useTalentSkills";
import type { CatalogSkill } from "@/types/talent-skills";

type CatalogSearchProps = {
    onAdd: (skill: CatalogSkill) => void;
};

export function CatalogSearch({ onAdd }: CatalogSearchProps) {
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(searchInput), 300);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const catalogQuery = useTalentSkillsCatalog(debouncedSearch, true);
    const items = catalogQuery.data ?? [];

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary" />
                <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Rechercher dans le catalogue…"
                    className="w-full rounded-lg border border-secondary bg-primary py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-secondary"
                />
            </div>

            {catalogQuery.isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />
                    ))}
                </div>
            ) : null}

            {catalogQuery.isError ? (
                <p className="text-sm text-red-600">Impossible de charger le catalogue.</p>
            ) : null}

            {!catalogQuery.isLoading && !catalogQuery.isError && items.length === 0 ? (
                <p className="text-sm text-tertiary">Aucune compétence trouvée dans le catalogue.</p>
            ) : null}

            <ul className="space-y-2">
                {items.map((skill) => (
                    <li
                        key={skill.skill_id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-secondary/70 bg-primary px-4 py-3"
                    >
                        <div className="min-w-0">
                            <p className="font-medium text-primary">{skill.skill_name}</p>
                            {skill.category ? <p className="text-xs text-tertiary">{skill.category}</p> : null}
                        </div>
                        <Button
                            type="button"
                            color="secondary"
                            size="sm"
                            isDisabled={skill.already_added}
                            onClick={() => onAdd(skill)}
                        >
                            {skill.already_added ? "Déjà ajoutée" : "Ajouter"}
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
