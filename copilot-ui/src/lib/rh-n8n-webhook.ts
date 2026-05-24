/**
 * Préfixe webhook n8n pour les routes RH métier (`/webhook` ou `/webhook-test`).
 */
import { buildN8nUrl } from "@/lib/build-n8n-url";

/** `/webhook` par défaut ; surcharge via `VITE_N8N_WEBHOOK_PREFIX`. */
export function resolveN8nWebhookPrefix(): string {
    const fromEnv = (import.meta.env.VITE_N8N_WEBHOOK_PREFIX as string | undefined)?.trim();
    if (fromEnv) {
        const p = fromEnv.startsWith("/") ? fromEnv : `/${fromEnv}`;
        return p.replace(/\/+$/, "");
    }
    return "/webhook";
}

/**
 * Un seul préfixe par défaut (évite les 404 en double sur `/webhook-test`).
 * Préfixe secondaire uniquement si `VITE_N8N_WEBHOOK_PREFIX_FALLBACK` est défini.
 */
export function resolveN8nWebhookPrefixCandidates(): string[] {
    const primary = resolveN8nWebhookPrefix();
    const out = [primary];
    const fallback = (import.meta.env.VITE_N8N_WEBHOOK_PREFIX_FALLBACK as string | undefined)?.trim();
    if (fallback) {
        const norm = (fallback.startsWith("/") ? fallback : `/${fallback}`).replace(/\/+$/, "");
        if (norm && norm !== primary) out.push(norm);
    }
    return out;
}

/** URL absolue ou relative `{prefix}/…` selon l’environnement (proxy Vite en dev). */
export function buildRhN8nWebhookPath(pathAfterPrefix: string, prefix?: string): string {
    const p = prefix ?? resolveN8nWebhookPrefix();
    const suffix = pathAfterPrefix.startsWith("/") ? pathAfterPrefix : `/${pathAfterPrefix}`;
    return buildN8nUrl(`${p}${suffix}`);
}

export function employmentWebhook404Hint(): string {
    return (
        "Webhook employment introuvable. Publiez WF_RH_Employment sur /webhook/rh/talents/:id/employment " +
        "(ou définissez VITE_N8N_WEBHOOK_PREFIX=/webhook-test si le workflow est en mode test)."
    );
}
