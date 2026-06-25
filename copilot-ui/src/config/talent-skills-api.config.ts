import { readEnv, trimUrl } from "@/config/resolve-api-url";

/** Collection skills talent — liste, summary, catalog, gaps, POST. */
export const TALENT_SKILLS_BASE_PATH = "/webhook/talent/skills";

/**
 * PATCH mise à jour compétence talent.
 *
 * Défaut : `/webhook/wf-talent-skills-update-v1/talent/skills/{id}`
 *
 * Surcharges :
 * - `VITE_TALENT_SKILLS_UPDATE_URL` : modèle avec `:id` ou chemin + id en suffixe
 * - `VITE_TALENT_SKILLS_UPDATE_PREFIX` : préfixe avant `/{skillId}` (sans slash final)
 */
export function getTalentSkillUpdatePatchUrl(skillId: string): string {
    const id = String(skillId ?? "").trim();
    if (!id) throw new Error("Missing skill id");
    const lower = id.toLowerCase();
    if (lower === ":id" || lower === ":skillid") throw new Error("Invalid skill id placeholder");
    const enc = encodeURIComponent(id);

    const explicit = readEnv("VITE_TALENT_SKILLS_UPDATE_URL");
    if (explicit) {
        if (/^https?:\/\//i.test(explicit)) {
            if (explicit.includes(":id") || explicit.includes(":skillId")) {
                return explicit.split(":skillId").join(enc).split(":id").join(enc);
            }
            return `${explicit.replace(/\/$/, "")}/${enc}`;
        }
        const rel =
            explicit.includes(":id") || explicit.includes(":skillId")
                ? explicit.split(":skillId").join(enc).split(":id").join(enc)
                : `${explicit.replace(/\/$/, "")}/${enc}`;
        return rel.startsWith("/") ? rel : `/${rel}`;
    }

    const prefix = readEnv("VITE_TALENT_SKILLS_UPDATE_PREFIX")?.trim().replace(/\/$/, "");
    if (prefix) return `${prefix}/${enc}`;

    const apiBase = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (apiBase) return `${apiBase}/wf-talent-skills-update-v1/talent/skills/${enc}`;
    return `/webhook/wf-talent-skills-update-v1/talent/skills/${enc}`;
}

/**
 * DELETE suppression compétence talent.
 *
 * Défaut : `/webhook/wf-talent-skills-delete-v1/talent/skills/{id}`
 *
 * Surcharges :
 * - `VITE_TALENT_SKILLS_DELETE_URL` : modèle avec `:id` ou chemin + id en suffixe
 * - `VITE_TALENT_SKILLS_DELETE_PREFIX` : préfixe avant `/{skillId}` (sans slash final)
 */
export function getTalentSkillDeleteUrl(skillId: string): string {
    const id = String(skillId ?? "").trim();
    if (!id) throw new Error("Missing skill id");
    const lower = id.toLowerCase();
    if (lower === ":id" || lower === ":skillid") throw new Error("Invalid skill id placeholder");
    const enc = encodeURIComponent(id);

    const explicit = readEnv("VITE_TALENT_SKILLS_DELETE_URL");
    if (explicit) {
        if (/^https?:\/\//i.test(explicit)) {
            if (explicit.includes(":id") || explicit.includes(":skillId")) {
                return explicit.split(":skillId").join(enc).split(":id").join(enc);
            }
            return `${explicit.replace(/\/$/, "")}/${enc}`;
        }
        const rel =
            explicit.includes(":id") || explicit.includes(":skillId")
                ? explicit.split(":skillId").join(enc).split(":id").join(enc)
                : `${explicit.replace(/\/$/, "")}/${enc}`;
        return rel.startsWith("/") ? rel : `/${rel}`;
    }

    const prefix = readEnv("VITE_TALENT_SKILLS_DELETE_PREFIX")?.trim().replace(/\/$/, "");
    if (prefix) return `${prefix}/${enc}`;

    const apiBase = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (apiBase) return `${apiBase}/wf-talent-skills-delete-v1/talent/skills/${enc}`;
    return `/webhook/wf-talent-skills-delete-v1/talent/skills/${enc}`;
}
