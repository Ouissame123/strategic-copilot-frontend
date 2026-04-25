/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Timeout HTTP client partagé (apiClient, httpRequest), ms — défaut 30000. */
    readonly VITE_HTTP_TIMEOUT_MS?: string;
    /** Délai dédié GET portfolio overview (n8n souvent lent) — défaut max(HTTP, 60000). */
    readonly VITE_PORTFOLIO_TIMEOUT_MS?: string;
    /**
     * URL complète du journal de décisions projet (n8n).
     * Si absent : `{VITE_PROJECT_API_BASE}/decision-log`.
     */
    readonly VITE_PROJECT_DECISION_LOG_URL?: string;
    /**
     * Ancien endpoint « détails projet » (KPI, alertes, explication, etc.), souvent en `?project_id=…`.
     * Utilisé par `getProjectDetailsUrl` — **pas** par la fiche projet `getProjectById`.
     * Si absent : `{VITE_PROJECT_API_BASE}/details?project_id=…`
     */
    readonly VITE_PROJECT_DETAILS_URL?: string;
    /**
     * Fiche projet **par identifiant dans le chemin** : modèle d’URL avec le placeholder **`:id`**
     * (remplacé côté code par l’UUID du projet). Ex. `…/webhook/…/api/projects/:id`.
     * Utilisé par `getProjectById` / page détail `/projects/:id`.
     * Si absent : `{VITE_API_BASE_URL}/webhook/api/projects/{id}`.
     */
    readonly VITE_PROJECT_BY_ID_URL?: string;
    /**
     * WF_Talent_Matching — URL du webhook matching talents pour un projet (`?project_id=` ou `:id` selon la config).
     * Si absent : `{VITE_PROJECT_API_BASE}/talents?project_id=…`
     */
    readonly VITE_PROJECT_TALENT_MATCHING_URL?: string;
    /** `true` : POST JSON `{ project_id }` sur le chemin talents au lieu de GET avec query. */
    readonly VITE_PROJECT_TALENT_MATCHING_USE_POST?: string;
    /** UUID projet : chargement auto du matching sur l’aperçu RH Talent (vue d’ensemble). */
    readonly VITE_RH_TALENT_OVERVIEW_PROJECT_ID?: string;
    /**
     * UUID entreprise pour GET workspace manager overview (`?enterprise_id=`) si absent du profil `/me`.
     * Sans valeur : l’appel overview est fait sans query (le webhook peut inférer le périmètre via le token).
     */
    readonly VITE_MANAGER_ENTERPRISE_ID?: string;
    /** GET liste talents enrichie n8n (sinon `/webhook/api/talents`). Ex. prod : `https://host/webhook/api/talents`. */
    readonly VITE_TALENTS_WEBHOOK_URL?: string;

    /** Mode simple : préfixe unique (ex. `https://host/webhook`) pour chemins relatifs. */
    readonly VITE_API_BASE_URL?: string;
    /**
     * Chemin GET liste projets (prioritaire), relatif à `VITE_API_BASE_URL`. Ex. `/webhook/api/projects/list`.
     * Sinon : `VITE_PROJECTS_LIST_URL` (URL complète ou chemin).
     */
    readonly VITE_API_PROJECTS_LIST?: string;
    /**
     * GET liste projets (page portfolio / page Projets). URL complète ou chemin sous `VITE_API_BASE_URL`.
     * Défaut relatif : `/webhook/api/projects/list`.
     */
    readonly VITE_PROJECTS_LIST_URL?: string;

    /** Webhooks n8n — URL complète par route (prioritaire sur VITE_API_BASE_URL + chemin). */
    readonly VITE_API_LOGIN?: string;
    readonly VITE_API_REFRESH?: string;
    readonly VITE_API_LOGOUT?: string;
    readonly VITE_API_ME?: string;
    /** POST mot de passe (compte connecté). Défaut : `/me/password` relatif à `VITE_API_BASE_URL`. */
    readonly VITE_API_CHANGE_PASSWORD?: string;
    readonly VITE_API_RH_USERS_LIST?: string;
    readonly VITE_API_RH_USERS_CREATE?: string;
    readonly VITE_API_RH_USERS_ROLE?: string;
    readonly VITE_API_RH_USERS_STATUS?: string;
    /** Suffixe : `/{id}/password-reset` est ajouté automatiquement. */
    readonly VITE_API_RH_USERS_PASSWORD_RESET_BASE?: string;
    readonly VITE_API_RH_SESSIONS?: string;

    /**
     * Préfixe commun des webhooks n8n « projet » (chemins relatifs au navigateur, souvent combiné au proxy Vite).
     * Sert de base pour decision-log, details, talents, etc. **Ne remplace pas** `VITE_PROJECT_BY_ID_URL`
     * (fiche GET `/api/projects/:id` sur un autre chemin webhook).
     * Ex. `/webhook/api/project` → `…/details?project_id=…`
     */
    readonly VITE_PROJECT_API_BASE?: string;

    /** Préfixe portfolio n8n : GET `{base}/overview` */
    readonly VITE_PORTFOLIO_API_BASE?: string;
    /** Surcharge URL complète pour l’overview (prioritaire sur base + /overview). */
    readonly VITE_PORTFOLIO_OVERVIEW_URL?: string;

    /** Préfixe collection REST CRUD — surcharges optionnelles (URL complète du préfixe). */
    readonly VITE_CRUD_PROJECTS_URL?: string;
    readonly VITE_CRUD_PROJECTS_COLLECTION_URL?: string;
    readonly VITE_CRUD_PROJECTS_ONE_URL?: string;
    readonly VITE_CRUD_PROJECTS_UPDATE_URL?: string;
    readonly VITE_CRUD_PROJECTS_CANCEL_BASE_URL?: string;
    readonly VITE_CRUD_PROJECTS_ALT_URL?: string;
    /** URL complète endpoint monitoring projets (GET `/api/projects/monitoring`). */
    readonly VITE_PROJECTS_MONITORING_URL?: string;
    readonly VITE_CRUD_TALENTS_URL?: string;
    readonly VITE_CRUD_ASSIGNMENTS_URL?: string;
    readonly VITE_CRUD_SKILLS_URL?: string;
    readonly VITE_CRUD_TALENT_SKILLS_URL?: string;

    /** Racine API Copilot (ex. `https://host` ou webhooks n8n). */
    readonly VITE_COPILOT_API_BASE?: string;
    /** URL complète GET synthèse dashboard Copilot (défaut `/api/copilot/dashboard`). */
    readonly VITE_COPILOT_DASHBOARD_URL?: string;
    /** URL complète GET liste / portefeuille projets Copilot (défaut `/api/copilot/projects`). */
    readonly VITE_COPILOT_PROJECTS_URL?: string;
    /** Modèle d’URL GET détail projet (`:id` remplacé par l’identifiant) ou base + suffixe id (défaut `/api/copilot/projects/:id`). */
    readonly VITE_COPILOT_PROJECT_DETAIL_URL?: string;
    /** POST what-if (`:id` = projet). Défaut `/api/copilot/projects/:id/what-if`. */
    readonly VITE_COPILOT_WHAT_IF_URL?: string;
    /** URL complète GET staffing / talents Copilot (défaut `/api/copilot/staffing`). */
    readonly VITE_COPILOT_STAFFING_URL?: string;
    /** URL complète GET espace talent (défaut `/api/copilot/talent`). */
    readonly VITE_COPILOT_TALENT_URL?: string;
    /** URL liste / création actions RH (défaut `GET|POST /api/rh/actions`). */
    readonly VITE_RH_ACTIONS_URL?: string;
    /** PATCH action RH — `:id` remplacé par l’identifiant (sinon `{base}/{id}`). */
    readonly VITE_RH_ACTION_PATCH_URL?: string;
    /** GET synthèse dashboard RH (défaut `/api/rh/dashboard`). */
    readonly VITE_RH_DASHBOARD_URL?: string;
    /** GET écarts critiques (défaut `/api/rh/critical-gaps`). */
    readonly VITE_RH_CRITICAL_GAPS_URL?: string;
    /** GET liste plans de formation (défaut `/api/rh/training-plans`). */
    readonly VITE_RH_TRAINING_PLANS_URL?: string;
    /** GET alertes organisationnelles (défaut `/api/rh/organizational-alerts`). */
    readonly VITE_RH_ORG_ALERTS_URL?: string;
    /** POST simulation réaffectation (défaut `/api/rh/reallocation/simulate`). */
    readonly VITE_RH_REALLOCATION_SIMULATE_URL?: string;
    /** POST validation réaffectation (défaut `/api/rh/reallocation/validate`). */
    readonly VITE_RH_REALLOCATION_VALIDATE_URL?: string;
    /** POST plan de formation RH (défaut `/api/rh/training-plan`). */
    readonly VITE_RH_TRAINING_PLAN_URL?: string;
    /** URL complète POST enregistrement décision (défaut `/api/copilot/decision`). */
    readonly VITE_COPILOT_DECISION_URL?: string;
    /** `false` pour masquer l’UI d’enregistrement de décision si le backend n’est pas prêt. */
    readonly VITE_COPILOT_DECISION_ENABLED?: string;
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
