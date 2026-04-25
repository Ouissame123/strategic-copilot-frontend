/**
 * Point d’entrée configuration API — URLs et résolution via variables `VITE_*` (voir `.env.example` à la racine du dépôt).
 *
 * - `VITE_API_BASE_URL` : préfixe commun (ex. webhook n8n).
 * - Chemins relatifs : combinés avec la base ; URLs `https://…` utilisées telles quelles.
 */

export { backendApi } from "./backend-api";
export { crudApi } from "./crud-api";
export { readEnv, resolveApiUrl, trimUrl } from "./resolve-api-url";
export { getProjectsListBaseUrl } from "@/api/projects-list.api";
export {
    getProjectApiBase,
    getDecisionLogUrl,
    getProjectDetailsUrl,
    getProjectByIdUrl,
    getProjectTalentMatchingUrl,
    getProjectTalentMatchingPath,
} from "./project-api";
