import type { ProjectStatus, ProjectTab, TalentProjectListItem } from "@/types/talent-projects";

/** Onglets cycle de vie (hors « Tous ») — source unique filtre / badge / compteurs. */
export type ProjectLifecycleTab = Exclude<ProjectTab, "all">;

export const PROJECT_LIFECYCLE_TAB_LABELS: Record<ProjectLifecycleTab, string> = {
    planned: "Planifié",
    active: "Actif",
    past: "Passé",
};

export const PROJECT_LIFECYCLE_TAB_TONES: Record<ProjectLifecycleTab, "amber" | "emerald" | "slate"> = {
    planned: "amber",
    active: "emerald",
    past: "slate",
};

/**
 * Mapping front unique : statut projet API → onglet cycle de vie.
 * Aligné sur la sémantique des filtres (Actifs / Planifiés / Passés).
 */
export function classifyFromProjectStatus(status: ProjectStatus): ProjectLifecycleTab {
    if (status === "planned" || status === "on_hold") return "planned";
    if (status === "completed" || status === "cancelled") return "past";
    return "active";
}

/**
 * Classification d'un item liste.
 * Préfère `computed_tab` (même champ que le filtre API) pour éviter
 * Actifs + badge « Planifié » quand `project_status` diverge.
 */
export function classifyProjectTab(
    project: Pick<TalentProjectListItem, "computed_tab" | "project_status">,
): ProjectLifecycleTab {
    const tab = project.computed_tab;
    if (tab === "active" || tab === "planned" || tab === "past") return tab;
    return classifyFromProjectStatus(project.project_status);
}

export function projectMatchesTab(project: TalentProjectListItem, tab: ProjectTab): boolean {
    if (tab === "all") return true;
    return classifyProjectTab(project) === tab;
}

export type ProjectTabCounts = {
    active: number;
    planned: number;
    past: number;
    total: number;
};

/** Compteurs dérivés de la même classification que filtres + badges. */
export function countProjectsByTab(projects: readonly TalentProjectListItem[]): ProjectTabCounts {
    const counts: ProjectTabCounts = { active: 0, planned: 0, past: 0, total: projects.length };
    for (const project of projects) {
        counts[classifyProjectTab(project)] += 1;
    }
    return counts;
}

export function emptyMessageForTab(tab: ProjectTab): string {
    if (tab === "planned") return "Aucun projet planifié";
    if (tab === "past") return "Aucun projet passé";
    if (tab === "active") return "Aucun projet actif";
    return "Aucun projet";
}
