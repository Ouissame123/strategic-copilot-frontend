/**
 * Base n8n unique pour tout le frontend (axios, `buildN8nUrl`, résolution `backend-api`).
 *
 * **Développement (`vite dev`)** : par défaut chaîne vide → URLs relatives `/webhook/...` sur l’origine Vite.
 * Le proxy (`vite.config.ts`) relaie vers n8n : **pas de CORS** (indispensable pour le login en `fetch` natif).
 * Si `VITE_API_BASE_URL` ou une base absolue est utilisée ici en dev sans CORS n8n → erreur navigateur **« Failed to fetch »**.
 *
 * **Direct n8n en dev** (CORS requis côté n8n) : `VITE_N8N_DIRECT_IN_DEV=1` + `VITE_N8N_BASE_URL` (éventuellement `VITE_API_BASE_URL` en secours).
 *
 * **Axios seul en direct en dev** (login toujours via proxy) : `VITE_HTTP_CLIENT_N8N_BASE=https://…/webhook` — voir `getHttpClientBaseUrl()`.
 *
 * **Production (Vercel)** : par défaut chaîne vide → `/webhook/...` sur la même origine ;
 * les rewrites `vercel.json` relaient vers n8n (évite CORS / « Failed to fetch » au login).
 * Appel direct n8n : `VITE_N8N_BASE_URL` ou `VITE_N8N_DIRECT_IN_PROD=1` (CORS requis côté n8n).
 */
const DEFAULT_N8N_HOST_PRODUCTION = "https://n8nprod.aphelionxinnovations.com";

function trimBase(v: string | undefined): string {
    return (v ?? "").trim().replace(/\/+$/, "");
}

/** Retire un éventuel `/webhook` final pour obtenir l’origine hôte (baseURL + chemins `/webhook/...`). */
function stripTrailingWebhookSegment(base: string): string {
    const b = trimBase(base);
    if (!b) return "";
    const lower = b.toLowerCase();
    if (lower.endsWith("/webhook")) {
        return b.slice(0, b.length - "/webhook".length).replace(/\/+$/, "");
    }
    return b;
}

/** Origine hôte sans slash final, ou chaîne vide (chemins relatifs → proxy Vite en dev par défaut). */
export function getN8nBaseUrl(): string {
    if (import.meta.env.DEV) {
        const directDev = String(import.meta.env.VITE_N8N_DIRECT_IN_DEV ?? "").trim() === "1";
        if (!directDev) return "";

        const fromN8nRaw = trimBase(import.meta.env.VITE_N8N_BASE_URL as string | undefined);
        const fromN8n = fromN8nRaw ? stripTrailingWebhookSegment(fromN8nRaw) : "";
        if (fromN8n) return fromN8n;

        const fromApiRawDev = trimBase(import.meta.env.VITE_API_BASE_URL as string | undefined);
        const fromApiDev = fromApiRawDev ? stripTrailingWebhookSegment(fromApiRawDev) : "";
        if (fromApiDev) return fromApiDev;

        return "";
    }

    const fromApiRaw = trimBase(import.meta.env.VITE_API_BASE_URL as string | undefined);
    const fromApi = fromApiRaw ? stripTrailingWebhookSegment(fromApiRaw) : "";
    if (fromApi) return fromApi;

    const fromN8nRaw = trimBase(import.meta.env.VITE_N8N_BASE_URL as string | undefined);
    const fromN8n = fromN8nRaw ? stripTrailingWebhookSegment(fromN8nRaw) : "";
    if (fromN8n) return fromN8n;

    const directProd = String(import.meta.env.VITE_N8N_DIRECT_IN_PROD ?? "").trim() === "1";
    if (directProd) return DEFAULT_N8N_HOST_PRODUCTION;

    /** Chemins relatifs → rewrites Vercel / reverse-proxy (pas de CORS navigateur). */
    return "";
}

/**
 * URL absolue vers n8n si une base est configurée, sinon chemin relatif (ex. `/webhook/...`) pour le proxy Vite.
 */
export function buildN8nUrl(path: string): string {
    const cleanBase = getN8nBaseUrl();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    if (!cleanBase) return cleanPath;
    return `${cleanBase}${cleanPath}`;
}

/**
 * Base utilisée **uniquement par axios** (`httpClient`). Permet en dev d’appeler n8n en direct pour les requêtes
 * axios tout en laissant `getN8nBaseUrl()` vide pour le login (`fetch` + `backendApi`) qui passe par le proxy Vite.
 *
 * Définir `VITE_HTTP_CLIENT_N8N_BASE=https://…/webhook` (suffixe `/webhook` retiré en interne) **uniquement si**
 * le proxy renvoie 404 alors que n8n répond en direct (CORS requis sur `/webhook/*`).
 */
export function getHttpClientBaseUrl(): string {
    const axiosOnly = trimBase(import.meta.env.VITE_HTTP_CLIENT_N8N_BASE as string | undefined);
    if (import.meta.env.DEV && axiosOnly) {
        return stripTrailingWebhookSegment(axiosOnly);
    }
    return getN8nBaseUrl();
}
