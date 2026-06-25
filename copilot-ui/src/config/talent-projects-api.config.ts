import { readEnv, trimUrl } from "@/config/resolve-api-url";

/** Liste + summary — WF talent projects (collection). */
export const TALENT_PROJECTS_LIST_PATH = "/webhook/talent/projects";

/**
 * GET détail projet talent (équipe, exigences, viabilité, alertes).
 *
 * Défaut : `/webhook/wf-talent-projects-detail-v1/talent/projects/{id}`
 *
 * Surcharges :
 * - `VITE_TALENT_PROJECTS_DETAIL_URL` : modèle avec `:id` ou chemin + id en suffixe
 * - `VITE_TALENT_PROJECTS_DETAIL_PREFIX` : préfixe avant `/{projectId}` (sans slash final)
 */
export function getTalentProjectDetailGetUrl(projectId: string): string {
    const id = String(projectId ?? "").trim();
    if (!id) throw new Error("Missing project id");
    const lower = id.toLowerCase();
    if (lower === ":id" || lower === ":projectid") throw new Error("Invalid project id placeholder");
    const enc = encodeURIComponent(id);

    const explicit = readEnv("VITE_TALENT_PROJECTS_DETAIL_URL");
    if (explicit) {
        if (/^https?:\/\//i.test(explicit)) {
            if (explicit.includes(":id") || explicit.includes(":projectId")) {
                return explicit.split(":projectId").join(enc).split(":id").join(enc);
            }
            return `${explicit.replace(/\/$/, "")}/${enc}`;
        }
        const rel =
            explicit.includes(":id") || explicit.includes(":projectId")
                ? explicit.split(":projectId").join(enc).split(":id").join(enc)
                : `${explicit.replace(/\/$/, "")}/${enc}`;
        return rel.startsWith("/") ? rel : `/${rel}`;
    }

    const prefix = readEnv("VITE_TALENT_PROJECTS_DETAIL_PREFIX")?.trim().replace(/\/$/, "");
    if (prefix) return `${prefix}/${enc}`;

    const apiBase = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (apiBase) return `${apiBase}/wf-talent-projects-detail-v1/talent/projects/${enc}`;
    return `/webhook/wf-talent-projects-detail-v1/talent/projects/${enc}`;
}
