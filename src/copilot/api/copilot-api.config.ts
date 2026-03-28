/**
 * URLs Copilot — base + chemins REST versionnés.
 *
 * - `VITE_COPILOT_API_BASE` : racine API (ex. `https://api.example.com` ou `https://api.example.com/api`).
 * - Par défaut : `POST {base}/v1/copilot/insights` et `POST {base}/v1/copilot/decisions`.
 *
 * Surcharges optionnelles :
 * - `VITE_COPILOT_INSIGHTS_URL` / `VITE_COPILOT_DECISIONS_URL` : URL complète (ignore base + chemins).
 * - `VITE_COPILOT_PATH_INSIGHTS` / `VITE_COPILOT_PATH_DECISIONS` : chemin relatif à la base (ex. `/api/v1/copilot/insights`).
 */

function trimBase(base: string | undefined): string {
    return (base ?? "").trim().replace(/\/$/, "");
}

function trimUrl(u: string | undefined): string | undefined {
    const t = u?.trim();
    return t || undefined;
}

function joinBaseAndPath(base: string, path: string): string {
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${base}${p}`;
}

/** Chemins par défaut (relatifs à `VITE_COPILOT_API_BASE`). */
export const COPILOT_DEFAULT_PATHS = {
    /** POST — génération d’insights (CopilotInsightsRequestDto → CopilotInsightsResponseDto) */
    insights: "/v1/copilot/insights",
    /** POST — enregistrement d’une décision utilisateur */
    decisions: "/v1/copilot/decisions",
} as const;

/** e.g. import.meta.env.VITE_COPILOT_API_BASE */
export function getCopilotApiBase(): string {
    return trimBase(import.meta.env.VITE_COPILOT_API_BASE as string | undefined);
}

export function isCopilotApiConfigured(): boolean {
    return getCopilotApiBase().length > 0;
}

/**
 * When true, uses local dev fallback (no HTTP) — isolated; requires explicit opt-in.
 * Set VITE_COPILOT_USE_FALLBACK=true for local UX demos without a backend.
 */
export function isCopilotDevFallbackEnabled(): boolean {
    return import.meta.env.VITE_COPILOT_USE_FALLBACK === "true";
}

function resolveInsightsPath(): string {
    const custom = trimUrl(import.meta.env.VITE_COPILOT_PATH_INSIGHTS as string | undefined);
    if (custom) return custom.startsWith("/") ? custom : `/${custom}`;
    return COPILOT_DEFAULT_PATHS.insights;
}

function resolveDecisionsPath(): string {
    const custom = trimUrl(import.meta.env.VITE_COPILOT_PATH_DECISIONS as string | undefined);
    if (custom) return custom.startsWith("/") ? custom : `/${custom}`;
    return COPILOT_DEFAULT_PATHS.decisions;
}

/** URL finale pour POST insights (URL absolue optionnelle, sinon base + chemin). */
export function copilotInsightsUrl(): string {
    const full = trimUrl(import.meta.env.VITE_COPILOT_INSIGHTS_URL as string | undefined);
    if (full) return full;
    const base = getCopilotApiBase();
    if (!base) return "";
    return joinBaseAndPath(base, resolveInsightsPath());
}

/** URL finale pour POST décision (URL absolue optionnelle, sinon base + chemin). */
export function copilotDecisionsUrl(): string {
    const full = trimUrl(import.meta.env.VITE_COPILOT_DECISIONS_URL as string | undefined);
    if (full) return full;
    const base = getCopilotApiBase();
    if (!base) return "";
    return joinBaseAndPath(base, resolveDecisionsPath());
}

/** @deprecated alias — préférer `copilotInsightsUrl` */
export const copilotInsightsRunUrl = copilotInsightsUrl;

/** @deprecated alias — préférer `copilotDecisionsUrl` */
export const copilotDecisionSubmitUrl = copilotDecisionsUrl;
