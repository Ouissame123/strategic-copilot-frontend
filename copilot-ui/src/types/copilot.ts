/**
 * Contrat d’affichage Copilot — aligné sur le backend (GET/POST /api/copilot/*).
 * Le frontend n’enrichit pas ces structures.
 */

export type CopilotScope = "dashboard" | "projects_list" | "project_detail" | "staffing" | "none";

/** Insight / risque renvoyé par le backend (distinct du legacy `copilot/copilot-types`). */
export interface CopilotBackendInsight {
    type?: string;
    severity?: "low" | "medium" | "high";
    title?: string;
    message?: string;
    project_id?: string;
}

export interface CopilotBackendRecommendation {
    type?: string;
    label?: string;
}

export interface CopilotResponse {
    status?: string;
    scope?: CopilotScope | string;
    project_id?: string | null;
    summary?: string | null;
    explanation?: string | null;
    viability_score?: number | null;
    decision?: "Continue" | "Adjust" | "Stop" | string | null;
    confidence?: number | null;
    risks?: CopilotBackendInsight[];
    insights?: CopilotBackendInsight[];
    recommendations?: CopilotBackendRecommendation[];
    recommendations_text?: string[];
    /** Champs additionnels non typés — conservés pour affichage brut si besoin */
    [key: string]: unknown;
}

export type CopilotDecisionScope = Exclude<CopilotScope, "none">;

export interface SaveCopilotDecisionPayload {
    enterprise_id?: string;
    manager_id?: string;
    scope: CopilotDecisionScope;
    project_id?: string;
    decision: "Continue" | "Adjust" | "Stop" | string;
    reason?: string;
    score?: number;
    confidence?: number;
    analysis_run_id?: string;
    payload?: Record<string, unknown>;
}

export interface CopilotPageContext {
    scope: CopilotScope;
    pageLabel: string;
    projectId?: string;
    entityLabel?: string;
}

/** Contexte page pour le chat Copilot (POST insights) — données brutes côté page. */
export interface CopilotChatPageContext {
    page: string;
    data: Record<string, unknown>;
}

/** Réponse assistant structurée (POST insights / chat). */
export interface CopilotAssistantStructured {
    summary?: string;
    explanation?: string;
    recommendations_text?: string[];
}

export interface CopilotMessage {
    id: string;
    role: "user" | "assistant";
    /** Texte brut (utilisateur) ou secours si pas de structure. */
    content: string;
    timestamp: number;
    structured?: CopilotAssistantStructured;
    /** Erreur API (affichage atténué). */
    error?: boolean;
}
