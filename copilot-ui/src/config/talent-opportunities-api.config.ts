import { readEnv, trimUrl } from "@/config/resolve-api-url";

/** Liste + summary opportunités talent (collection). */
export const TALENT_OPPORTUNITIES_BASE_PATH = "/webhook/talent/opportunities";

function resolveTalentOpportunityIdUrl(
    projectId: string,
    options: {
        envUrlKey: string;
        envPrefixKey: string;
        defaultWorkflowSegment: string;
        defaultSuffix?: string;
    },
): string {
    const id = String(projectId ?? "").trim();
    if (!id) throw new Error("Missing project id");
    const lower = id.toLowerCase();
    if (lower === ":id" || lower === ":projectid") throw new Error("Invalid project id placeholder");
    const enc = encodeURIComponent(id);
    const suffix = options.defaultSuffix ?? "";

    const explicit = readEnv(options.envUrlKey);
    if (explicit) {
        if (/^https?:\/\//i.test(explicit)) {
            if (explicit.includes(":id") || explicit.includes(":projectId")) {
                return explicit.split(":projectId").join(enc).split(":id").join(enc);
            }
            return `${explicit.replace(/\/$/, "")}/${enc}${suffix}`;
        }
        const rel =
            explicit.includes(":id") || explicit.includes(":projectId")
                ? explicit.split(":projectId").join(enc).split(":id").join(enc)
                : `${explicit.replace(/\/$/, "")}/${enc}${suffix}`;
        return rel.startsWith("/") ? rel : `/${rel}`;
    }

    const prefix = readEnv(options.envPrefixKey)?.trim().replace(/\/$/, "");
    if (prefix) return `${prefix}/${enc}${suffix}`;

    const apiBase = trimUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (apiBase) return `${apiBase}/${options.defaultWorkflowSegment}/talent/opportunities/${enc}${suffix}`;
    return `/webhook/${options.defaultWorkflowSegment}/talent/opportunities/${enc}${suffix}`;
}

/**
 * GET détail opportunité talent (drawer Mes opportunités).
 *
 * Défaut : `/webhook/wf-talent-opp-detail-v1/talent/opportunities/{id}`
 */
export function getTalentOpportunityDetailGetUrl(projectId: string): string {
    return resolveTalentOpportunityIdUrl(projectId, {
        envUrlKey: "VITE_TALENT_OPPORTUNITIES_DETAIL_URL",
        envPrefixKey: "VITE_TALENT_OPPORTUNITIES_DETAIL_PREFIX",
        defaultWorkflowSegment: "wf-talent-opp-detail-v1",
    });
}

/**
 * POST exprimer intérêt pour une opportunité.
 *
 * Défaut : `/webhook/wf-talent-opp-interest-v1/talent/opportunities/{id}/interest`
 */
export function getTalentOpportunityInterestPostUrl(projectId: string): string {
    return resolveTalentOpportunityIdUrl(projectId, {
        envUrlKey: "VITE_TALENT_OPPORTUNITIES_INTEREST_URL",
        envPrefixKey: "VITE_TALENT_OPPORTUNITIES_INTEREST_PREFIX",
        defaultWorkflowSegment: "wf-talent-opp-interest-v1",
        defaultSuffix: "/interest",
    });
}
