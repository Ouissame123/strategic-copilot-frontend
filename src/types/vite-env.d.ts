/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Racine API (ex. `https://host` ou `https://host/api`). Par défaut : POST `{base}/v1/copilot/insights` et `{base}/v1/copilot/decisions`. */
    readonly VITE_COPILOT_API_BASE?: string;
    /** URL complète pour POST insights (prioritaire sur base + chemin). */
    readonly VITE_COPILOT_INSIGHTS_URL?: string;
    /** URL complète pour POST décisions (prioritaire sur base + chemin). */
    readonly VITE_COPILOT_DECISIONS_URL?: string;
    /** Chemin relatif à la base pour insights (ex. `/api/v1/copilot/insights`). */
    readonly VITE_COPILOT_PATH_INSIGHTS?: string;
    /** Chemin relatif à la base pour décisions. */
    readonly VITE_COPILOT_PATH_DECISIONS?: string;
    /** When "true" and API base is unset, load static dev insights (no network). */
    readonly VITE_COPILOT_USE_FALLBACK?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
