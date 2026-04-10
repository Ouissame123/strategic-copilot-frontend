/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Mode simple : préfixe unique (ex. `https://host/webhook`) pour chemins relatifs. */
    readonly VITE_API_BASE_URL?: string;

    /** Webhooks n8n — URL complète par route (prioritaire sur VITE_API_BASE_URL + chemin). */
    readonly VITE_API_LOGIN?: string;
    readonly VITE_API_REFRESH?: string;
    readonly VITE_API_LOGOUT?: string;
    readonly VITE_API_ME?: string;
    readonly VITE_API_RH_USERS_LIST?: string;
    readonly VITE_API_RH_USERS_CREATE?: string;
    readonly VITE_API_RH_USERS_ROLE?: string;
    readonly VITE_API_RH_USERS_STATUS?: string;
    /** Suffixe : `/{id}/password-reset` est ajouté automatiquement. */
    readonly VITE_API_RH_USERS_PASSWORD_RESET_BASE?: string;
    readonly VITE_API_RH_SESSIONS?: string;

    /** Racine API Copilot (ex. `https://host` ou webhooks n8n). */
    readonly VITE_COPILOT_API_BASE?: string;
    /** URL complète pour POST insights (prioritaire sur base + chemin). */
    readonly VITE_COPILOT_INSIGHTS_URL?: string;
    /** URL complète pour POST décisions (prioritaire sur base + chemin). */
    readonly VITE_COPILOT_DECISIONS_URL?: string;
    /** Chemin relatif à la base pour insights (ex. `/api/v1/copilot/insights`). */
    readonly VITE_COPILOT_PATH_INSIGHTS?: string;
    /** Chemin relatif à la base pour décisions. */
    readonly VITE_COPILOT_PATH_DECISIONS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
