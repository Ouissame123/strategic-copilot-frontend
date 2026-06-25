/** Origine n8n production. */
const DEFAULT_N8N_PROD = "https://n8nprod.aphelionxinnovations.com";

function trimBase(v: string): string {
    return v.trim().replace(/\/+$/, "");
}

const envOverride = trimBase((import.meta.env.VITE_N8N_API_BASE as string | undefined) ?? "");

/**
 * Dev : `''` → requêtes relatives `/webhook/*` relayées par le proxy Vite (pas de CORS).
 * Prod : URL absolue n8n. Override : `VITE_N8N_API_BASE`.
 */
export const API_BASE = envOverride
    ? envOverride
    : import.meta.env.PROD
      ? DEFAULT_N8N_PROD
      : "";

/** Préfixe `/webhook/…` — relatif en dev (proxy), absolu en prod. */
export function rhWebhookUrl(path: string): string {
    const segment = path.startsWith("/") ? path : `/${path}`;
    const webhookPath = segment.startsWith("/webhook/") ? segment : `/webhook${segment}`;
    return `${API_BASE}${webhookPath}`;
}

/** GET/POST — WF_RH_Talents_Profile_CRUD list + create */
export function rhAccountsTalentProfilePath(): string {
    return rhWebhookUrl("/rh/accounts/talent");
}

/** PATCH toggle status — workflow `wf-rh-talent-patch-v1` (body vide) */
export function rhAccountsTalentProfilePatchPath(talentId: string): string {
    return rhWebhookUrl(`/wf-rh-talent-patch-v1/rh/accounts/talent/${encodeURIComponent(talentId.trim())}`);
}

/** DELETE soft delete — workflow `wf-rh-talent-delete-v1` */
export function rhAccountsTalentProfileDeletePath(talentId: string): string {
    return rhWebhookUrl(`/wf-rh-talent-delete-v1/rh/accounts/talent/${encodeURIComponent(talentId.trim())}`);
}

/** WF_RH_Talent_Portal_Access — POST onboard (nouveau talent + compte) */
export function rhTalentOnboardPath(): string {
    return rhWebhookUrl("/rh/talents/onboard");
}

/** WF_RH_Talent_Portal_Access — POST grant-access — workflow `wf-rh-talent-grant-v1` (body `{ password }`) */
export function rhTalentGrantAccessPath(talentId: string): string {
    return rhWebhookUrl(
        `/wf-rh-talent-grant-v1/rh/talents/${encodeURIComponent(talentId.trim())}/grant-access`,
    );
}

/** WF_RH_Talent_Portal_Access — GET talents sans compte portail */
export function rhTalentUnlinkedPath(): string {
    return rhWebhookUrl("/rh/talents/unlinked");
}

/** WF_RH_Users_Management — GET/POST list + create */
export function rhAccountsUsersPath(): string {
    return rhWebhookUrl("/rh/users");
}

/** PATCH change_password | toggle_status — workflow `wf-rh-users-patch-v1` */
export function rhAccountsUsersPatchPath(userId: string): string {
    return rhWebhookUrl(`/wf-rh-users-patch-v1/rh/users/${encodeURIComponent(userId.trim())}`);
}

/** DELETE soft delete + cascade — workflow `wf-rh-users-delete-v1` */
export function rhAccountsUsersDeletePath(userId: string): string {
    return rhWebhookUrl(`/wf-rh-users-delete-v1/rh/users/${encodeURIComponent(userId.trim())}`);
}

/** WF_RH_Accounts_Audit_View — GET audit trail (query: since_days, limit, offset, search) */
export function rhAccountsAuditPath(): string {
    return rhWebhookUrl("/rh/accounts/audit");
}

export function rhAccountsOrphanedPath(): string {
    return rhWebhookUrl("/rh/accounts/orphaned");
}

export function rhAccountsStatsPath(): string {
    return rhWebhookUrl("/rh/accounts/stats");
}
