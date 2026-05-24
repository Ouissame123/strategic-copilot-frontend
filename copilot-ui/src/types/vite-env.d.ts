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
     * Préfixe webhook GET détail talent RH (`wf-rh-talents-detail-v1`).
     * Ex. test : `/webhook-test/wf-rh-talents-detail-v1` — prod : `/webhook/wf-rh-talents-detail-v1`.
     */
    readonly VITE_RH_TALENT_DETAIL_WEBHOOK_PREFIX?: string;
    /** URL complète avec `{id}` ou `:id` — ex. `https://n8nprod…/webhook/wf-rh-talents-detail-v1/rh/talents/{id}`. */
    readonly VITE_RH_TALENT_DETAIL_URL?: string;
    /**
     * Préfixe webhook DELETE talent — défaut `/webhook/wf-rh-talents-delete-v1/rh/talents`.
     */
    readonly VITE_RH_TALENT_DELETE_WEBHOOK_PREFIX?: string;
    /** URL DELETE complète avec `{id}` (optionnel, remplace le préfixe). */
    readonly VITE_RH_TALENT_DELETE_URL?: string;
    /**
     * Préfixe webhook PATCH talent — défaut `/webhook/wf-rh-talents-update-v1/rh/talents`.
     */
    readonly VITE_RH_TALENT_UPDATE_WEBHOOK_PREFIX?: string;
    /** URL PATCH complète avec `{id}` (optionnel, remplace le préfixe). */
    readonly VITE_RH_TALENT_UPDATE_URL?: string;
    /** Base webhook RH Skills GET — ex. `https://n8nprod…/webhook/wf-rh-skills-get-v1`. */
    readonly VITE_RH_SKILLS_BASE_URL?: string;
    /** WF_RH_Skills_Management — GET catalogue — ex. `https://n8nprod…/webhook/{webhookId}/rh/skills/catalog`. */
    readonly VITE_RH_SKILLS_CATALOG_URL?: string;
    /** Base webhook RH availability — ex. `https://n8nprod…/webhook` (sans slug workflow talents). */
    readonly VITE_RH_AVAILABILITY_WEBHOOK_BASE?: string;
    /** GET overview disponibilité RH — ex. `https://n8nprod…/webhook/rh/availability/overview`. */
    readonly VITE_RH_AVAILABILITY_OVERVIEW_URL?: string;
    /** GET disponibilité talent — ex. `https://n8nprod…/webhook/rh/talents/{id}/availability`. */
    readonly VITE_RH_TALENT_AVAILABILITY_URL?: string;
    /** GET employment talent — WF_RH_Employment (webhookId GET), placeholder `{id}`. */
    readonly VITE_RH_EMPLOYMENT_GET_URL?: string;
    /** PUT employment talent — WF_RH_Employment (webhookId PUT), placeholder `{id}`. */
    readonly VITE_RH_EMPLOYMENT_PUT_URL?: string;
    /** GET absences talent — placeholder `{id}` = UUID talent. */
    readonly VITE_RH_ABSENCES_GET_URL?: string;
    /** POST absence talent — placeholder `{id}` = UUID talent. */
    readonly VITE_RH_ABSENCES_POST_URL?: string;
    /** DELETE absence — placeholder `{id}` = UUID absence. */
    readonly VITE_RH_ABSENCES_DELETE_URL?: string;
    /** GET absences en cours (global). */
    readonly VITE_RH_ABSENCES_CURRENT_URL?: string;
    /**
     * POST WF_RH_Matching_Run — production `https://n8nprod.aphelionxinnovations.com/webhook/rh/matching`
     * (dev : `/webhook/rh/matching` via proxy Vite).
     */
    readonly VITE_RH_MATCHING_RUN_URL?: string;
    /**
     * GET résultats matching — production `…/webhook/rh/matching/results?project_id=`
     * (ne pas utiliser `/webhook-test/`).
     */
    readonly VITE_RH_MATCHING_RESULTS_URL?: string;
    /** GET liste projets — `…/webhook/rh/matching/projects` (réponse : `{ projects: [...] }`). */
    readonly VITE_RH_MATCHING_PROJECTS_URL?: string;
    /** @deprecated Utiliser `VITE_RH_ABSENCES_GET_URL`. */
    readonly VITE_RH_TALENT_ABSENCES_URL?: string;
    /** @deprecated Utiliser `VITE_RH_ABSENCES_DELETE_URL`. */
    readonly VITE_RH_ABSENCE_DELETE_URL?: string;
    /** POST analyst IPI — ex. `https://n8nprod…/webhook/api/analyst/ipi`. */
    readonly VITE_RH_ANALYST_IPI_URL?: string;
    /** POST analyst 9-Box — ex. `https://n8nprod…/webhook/api/analyst/nine-box`. */
    readonly VITE_RH_ANALYST_NINE_BOX_URL?: string;
    /** POST analyst IPI manager (body enterprise_id + manager_id). */
    readonly VITE_MANAGER_ANALYST_IPI_URL?: string;
    /** POST analyst 9-Box manager (body enterprise_id + manager_id). */
    readonly VITE_MANAGER_ANALYST_NINE_BOX_URL?: string;
    /** POST analyst mobilité manager (body enterprise_id + manager_id). */
    readonly VITE_MANAGER_ANALYST_MOBILITY_URL?: string;
    /** POST matching talents par projet (body enterprise_id + manager_id). */
    readonly VITE_MANAGER_PROJECT_TALENTS_URL?: string;
    /**
     * UUID entreprise pour GET workspace manager overview (`?enterprise_id=`) si absent du profil `/me`.
     * Sans valeur : l’appel overview est fait sans query (le webhook peut inférer le périmètre via le token).
     */
    readonly VITE_MANAGER_ENTERPRISE_ID?: string;
    /** GET liste talents enrichie n8n (sinon `/webhook/api/talents`). Ex. prod : `https://host/webhook/api/talents`. */
    readonly VITE_TALENTS_WEBHOOK_URL?: string;

    /**
     * GET détail talent manager — chemin ou URL avec `:talentId` / `:id` (encodé par le client).
     * Défaut : `/webhook/wmt-detail-v1/manager/team/:talentId` (workflow n8n WF_Manager_Team v1).
     */
    readonly VITE_MANAGER_TEAM_DETAIL_URL?: string;
    /**
     * PATCH mise à jour projet (`wmp-update-v1` par défaut). Chemin ou URL avec `:id` / `:projectId` (id encodé par le client).
     * Sinon préfixe `VITE_WMP_UPDATE_PROJECTS_PREFIX` + `/{id}`.
     * Par défaut (sans ces variables) : `{VITE_API_BASE_URL}/wmp-update-v1/manager/projects/{id}` ou `/webhook/wmp-update-v1/manager/projects/{id}`.
     */
    readonly VITE_MANAGER_PROJECTS_UPDATE_URL?: string;
    /** Préfixe PATCH projet avant `/{projectId}` (sans slash final). Ex. `/webhook/wmp-update-v1/manager/projects`. */
    readonly VITE_WMP_UPDATE_PROJECTS_PREFIX?: string;
    /**
     * GET détail projet manager — chemin ou URL avec `:id` (id encodé par le client).
     * Prioritaire sur `VITE_WMP_DETAIL_PROJECTS_PREFIX` et le défaut `…/wmp-detail-v1/manager/projects/{id}`.
     */
    readonly VITE_MANAGER_PROJECTS_DETAIL_URL?: string;
    /** Préfixe GET détail projet avant `/{projectId}` (sans slash final). Ex. `/webhook/wmp-detail-v1/manager/projects`. */
    readonly VITE_WMP_DETAIL_PROJECTS_PREFIX?: string;
    /** Préfixe POST assign (sans slash final). Voir `wmp-assignments-webhook.config.ts`. */
    readonly VITE_WMP_ASSIGN_PROJECTS_PREFIX?: string;
    /** Préfixe DELETE unassign (sans slash final). */
    readonly VITE_WMP_UNASSIGN_PROJECTS_PREFIX?: string;
    /**
     * Si `1` : après assign/unassign, lance `POST /webhook/api/copilot/recompute` pour ce projet.
     * Par défaut (absent ou autre valeur) : pas d’appel (évite erreurs 500 si le workflow n’est pas prêt).
     */
    readonly VITE_TRIGGER_PROJECT_RECOMPUTE_AFTER_ASSIGN?: string;

    /**
     * Hôte racine n8n (sans `/webhook`). En `npm run dev`, sert surtout de **cible du proxy** Vite (évite CORS) ;
     * en build / preview, base axios si définie. Voir `getN8nBaseUrl` dans `lib/build-n8n-url.ts`.
     */
    readonly VITE_N8N_BASE_URL?: string;
    /** Surcharge cible du proxy Vite `/webhook` (dev, si absent : `n8nprod.aphelionxinnovations.com` dans `vite.config`). */
    readonly VITE_N8N_PROXY_TARGET?: string;
    /** Si `1` : proxy vérifie la chaîne TLS même en dev (défaut dev : vérification assouplie). */
    readonly VITE_N8N_PROXY_STRICT_TLS?: string;
    /**
     * PATCH archivage conversation : chemin complet avec placeholder `{id}` ou `:id` (prioritaire sur le défaut
     * `wmc-archive-v1` puis fallback legacy). Ex. `/webhook/mon-workflow-v1/manager/conversations/{id}/archive`.
     */
    readonly VITE_N8N_WEBHOOK_CONV_ARCHIVE?: string;
    /**
     * Si `1` en dev : le client utilise `VITE_N8N_BASE_URL` comme origine réelle (appels cross-origin).
     * Par défaut (absent) : chemins relatifs + proxy — requis sauf si n8n expose les bons en-têtes CORS.
     */
    readonly VITE_N8N_DIRECT_IN_DEV?: string;
    /** Préfixe webhook RH/employment : `/webhook` (prod) ou `/webhook-test` (workflow n8n en test). */
    readonly VITE_N8N_WEBHOOK_PREFIX?: string;
    /**
     * Dev uniquement : origine n8n pour **axios** (`httpClient`) seulement (ex. `https://host/webhook`).
     * Laisse `getN8nBaseUrl()` vide pour le login en `fetch` relatif + proxy. CORS requis sur `/webhook/*`.
     */
    readonly VITE_HTTP_CLIENT_N8N_BASE?: string;
    /** Mode simple : préfixe unique (ex. `https://n8nprod.aphelionxinnovations.com/webhook`) pour les appels manager-projects
     * (`{VITE_API_BASE_URL}/manager/projects/...`) et autres chemins relatifs ; sans slash final. */
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
    /** URL liste / création actions RH (défaut `GET|POST /webhook/manager/rh-actions`). */
    /** GET/POST WF_Manager_RH_Actions — `/webhook/api/rh/actions`. */
    readonly VITE_RH_ACTIONS_URL?: string;
    /** PATCH WF_Manager_RH_Actions — `/webhook/c8bae94d-…/api/rh/actions/:id`. */
    readonly VITE_RH_ACTIONS_PATCH_URL?: string;
    /** PATCH action RH — `:id` remplacé par l’identifiant (sinon `{base}/{id}`). */
    readonly VITE_RH_ACTION_PATCH_URL?: string;
    /** GET synthèse dashboard RH (défaut `/webhook/rh/dashboard`). */
    readonly VITE_RH_DASHBOARD_URL?: string;
    /** GET analytics RH — WF_RH_Analytics (défaut `/webhook/rh/analytics`). */
    readonly VITE_RH_ANALYTICS_URL?: string;
    /** GET notifications RH — WF_RH_Notifications (défaut `/webhook/rh/notifications`). */
    readonly VITE_RH_NOTIFICATIONS_URL?: string;
    /** Base absolue optionnelle pour `DashboardRH` (ex. `https://…/webhook`). */
    readonly VITE_RH_DASHBOARD_API_BASE?: string;
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
