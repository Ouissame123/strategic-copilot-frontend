/**
 * Liste projets standard : `GET /api/projects/list` (+ `page`, `per_page`) via `apiGet` et `VITE_API_BASE_URL`.
 *
 * ## Contrat attendu pour la colonne « Responsable » (liste)
 * Chaque élément de `items[]` peut exposer **un seul** libellé lisible parmi (ordre de priorité côté SPA, voir `getOwnerFromRow` dans `use-projects-list-query.ts`) :
 * - `owner_name` — **recommandé** (chaîne, ex. « Marie Dupont »)
 * - `project_manager_name`
 * - `manager_name`
 * - `chef_projet`
 * - `lead_name`
 * - `responsible_name`
 * - `owner` — si objet, prévoir plutôt un champ texte dédié ; si chaîne, affichée telle quelle
 *
 * Sans l’un de ces champs, la colonne Responsable reste vide (aucun appel supplémentaire côté client).
 */
import { apiGet, type ApiClientOptions } from "@/utils/apiClient";

export function getProjectsListBaseUrl(): string {
    return "/api/projects/list";
}

function withPageParams(base: string, page: number, perPage: number): string {
    const joiner = base.includes("?") ? "&" : "?";
    return `${base}${joiner}page=${encodeURIComponent(String(page))}&per_page=${encodeURIComponent(String(perPage))}`;
}

/** Réponse brute JSON (items + pagination) — pas de transformation métier. */
export async function fetchProjectsListPage(page: number, perPage: number, options?: ApiClientOptions): Promise<unknown> {
    const url = withPageParams(getProjectsListBaseUrl(), page, perPage);
    return apiGet<unknown>(url, options);
}
