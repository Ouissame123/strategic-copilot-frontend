/**
 * Chemins CRUD REST (`/api/...`) — backend n8n ou proxy.
 * Surcharges possibles par ressource via `VITE_CRUD_*` (URL complète du préfixe collection).
 */
import { readEnv, resolveApiUrl } from "@/config/resolve-api-url";

function collection(explicitEnv: string | undefined, defaultRelative: string): string {
    return resolveApiUrl(explicitEnv, defaultRelative);
}

function byId(base: string, id: string): string {
    const b = base.replace(/\/$/, "");
    return `${b}/${encodeURIComponent(id)}`;
}

export const crudApi = {
    projects: {
        /** GET/POST liste + création */
        collection: () =>
            collection(
                readEnv("VITE_CRUD_PROJECTS_COLLECTION_URL") ??
                    readEnv("VITE_CRUD_PROJECTS_URL") ??
                    "/webhook/api/projects",
                "/api/projects",
            ),
        /** GET détail projet */
        one: (id: string) =>
            byId(
                collection(
                    readEnv("VITE_CRUD_PROJECTS_ONE_URL") ??
                        "/webhook/d0f5b013-5af1-491f-ad4e-e463a6a4cbc4/api/projects",
                    "/api/projects",
                ),
                id,
            ),
        /** PATCH update projet */
        update: (id: string) =>
            byId(
                collection(
                    readEnv("VITE_CRUD_PROJECTS_UPDATE_URL") ??
                        "/webhook/api-projects-update-v2/api/projects",
                    "/api/projects",
                ),
                id,
            ),
        /** POST annulation projet */
        cancel: (id: string) => {
            const base = collection(
                readEnv("VITE_CRUD_PROJECTS_CANCEL_BASE_URL") ??
                    "/webhook/api-projects-cancel-v1/api/projects",
                "/api/projects",
            );
            const one = byId(base, id);
            return `${one}/cancel`;
        },
        /** Alternative héritée éventuelle */
        collectionAlt: () =>
            collection(
                readEnv("VITE_CRUD_PROJECTS_ALT_URL") ??
                    "/webhook/api/PROJECT",
                "/api/PROJECT",
            ),
    },
    talents: {
        collection: () => collection(readEnv("VITE_CRUD_TALENTS_URL"), "/api/talents"),
        one: (id: string) => byId(collection(readEnv("VITE_CRUD_TALENTS_URL"), "/api/talents"), id),
    },
    assignments: {
        collection: () => collection(readEnv("VITE_CRUD_ASSIGNMENTS_URL"), "/api/assignments"),
        one: (id: string) => byId(collection(readEnv("VITE_CRUD_ASSIGNMENTS_URL"), "/api/assignments"), id),
    },
    skills: {
        collection: () => collection(readEnv("VITE_CRUD_SKILLS_URL"), "/api/skills"),
        one: (id: string) => byId(collection(readEnv("VITE_CRUD_SKILLS_URL"), "/api/skills"), id),
    },
    talentSkills: {
        collection: () => collection(readEnv("VITE_CRUD_TALENT_SKILLS_URL"), "/api/talent-skills"),
        one: (id: string) => byId(collection(readEnv("VITE_CRUD_TALENT_SKILLS_URL"), "/api/talent-skills"), id),
    },
} as const;
