import { readEnv } from "@/config/resolve-api-url";

/** Chemin relatif par défaut : webhook n8n `WF_Manager_Team` détail (`wmt-detail-v1`). */
const DEFAULT_MANAGER_TEAM_DETAIL_PREFIX = "/webhook/wmt-detail-v1/manager/team";

/**
 * URL ou chemin pour GET détail talent (`…/:talentId`).
 * `VITE_MANAGER_TEAM_DETAIL_URL` : chemin avec placeholders `:talentId` ou `:id`, ou base sans placeholder (l’id est ajouté).
 * URL absolue `https://…/…/:talentId` acceptée (hors proxy Vite en dev — préférer chemin relatif).
 */
export function getManagerTeamTalentDetailUrl(talentIdEncoded: string): string {
    const explicit = readEnv("VITE_MANAGER_TEAM_DETAIL_URL");
    if (explicit) {
        if (/^https?:\/\//i.test(explicit)) {
            if (explicit.includes(":talentId")) return explicit.split(":talentId").join(talentIdEncoded);
            if (explicit.includes(":id")) return explicit.split(":id").join(talentIdEncoded);
            return `${explicit.replace(/\/$/, "")}/${talentIdEncoded}`;
        }
        let rel = explicit;
        if (rel.includes(":talentId")) rel = rel.split(":talentId").join(talentIdEncoded);
        else if (rel.includes(":id")) rel = rel.split(":id").join(talentIdEncoded);
        else rel = `${rel.replace(/\/$/, "")}/${talentIdEncoded}`;
        return rel.startsWith("/") ? rel : `/${rel}`;
    }
    return `${DEFAULT_MANAGER_TEAM_DETAIL_PREFIX}/${talentIdEncoded}`;
}
