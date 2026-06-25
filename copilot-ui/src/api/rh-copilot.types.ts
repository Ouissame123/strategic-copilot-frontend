// ───────── Intent (les 16 du backend) ─────────
export type RhIntent =
    | "salutation"
    | "charge_dispo"
    | "etat_projets"
    | "risques_alertes"
    | "arbitrage"
    | "talent_par_competence"
    | "talent_detail"
    | "validation_rh"
    | "mobilite"
    | "gaps_competences"
    | "liste_talents"
    | "contrats_fin"
    | "demandes_rh"
    | "notifications"
    | "aide_generale";

// ───────── Agent actif (mapping PDF) ─────────
export type PdfAgent =
    | "observer"
    | "watchdog"
    | "strategist"
    | "matchmaker"
    | "analyst"
    | "helper"
    | "orchestrator";

export const INTENT_TO_AGENT: Record<RhIntent, PdfAgent | PdfAgent[]> = {
    charge_dispo: ["observer", "watchdog"],
    etat_projets: "observer",
    risques_alertes: "watchdog",
    arbitrage: "strategist",
    talent_par_competence: "matchmaker",
    talent_detail: "analyst",
    validation_rh: "helper",
    mobilite: ["strategist", "matchmaker"],
    gaps_competences: "matchmaker",
    liste_talents: "observer",
    contrats_fin: "watchdog",
    demandes_rh: "helper",
    notifications: "watchdog",
    salutation: "orchestrator",
    aide_generale: "orchestrator",
};

const RH_INTENTS = new Set<string>(Object.keys(INTENT_TO_AGENT));

export function parseRhIntent(raw: unknown): RhIntent | null {
    const v = String(raw ?? "").trim() as RhIntent;
    return RH_INTENTS.has(v) ? v : null;
}

// ───────── Priorité actions ─────────
export type ActionPriorite = "urgent" | "normal" | "low";

export interface ActionRecommandee {
    priorite: ActionPriorite;
    action: string;
    impact: string;
}

// ───────── Source consultée ─────────
export interface SourceDB {
    table: string;
    count: number;
}

// ───────── Suggested action (CTA) ─────────
export interface RhSuggestedAction {
    label: string;
    type: string;
    target_id?: string;
    context?: string;
}

// ───────── Messages ─────────
export type MessageRole = "user" | "assistant";

export interface RhMessage {
    id: string;
    role: MessageRole;
    content: string;
    intent: RhIntent | null;
    sources: SourceDB[] | null;
    suggested_actions: RhSuggestedAction[] | null;
    confidence: number | null;
    llm_model: string | null;
    created_at: string;
    analysis_run_id: string | null;
    analyse?: string | null;
    risques?: string[];
    actions_recommandees?: ActionRecommandee[];
    quick_replies?: string[];
}

// ───────── Conversation (sidebar) ─────────
export type ConversationStatus = "active" | "archived";
export type ConversationScope = "rh" | "manager" | "all";

export interface RhConversationSummary {
    id: string;
    project_id: string | null;
    project_name: string | null;
    manager_user_id: string | null;
    manager_name: string | null;
    manager_email: string | null;
    title: string;
    message_count: number;
    status: ConversationStatus;
    scope: ConversationScope;
    started_at: string;
    last_message_at: string | null;
    last_message_preview: string | null;
    last_message_role: MessageRole | null;
    last_intent: RhIntent | null;
    last_confidence: number | null;
    avg_confidence: number | null;
    messages: { user: number; assistant: number };
}

export interface RhConversationsListResponse {
    status: "success";
    enterprise_id: string;
    count: number;
    conversations: RhConversationSummary[];
    distribution: {
        active: number;
        archived: number;
        with_project: number;
        by_intent: Record<string, number>;
    };
}

export interface RhConversationDetailResponse {
    status: "success";
    enterprise_id: string;
    conversation: {
        id: string;
        project_id: string | null;
        project_name: string | null;
        manager_user_id: string | null;
        title: string;
        message_count: number;
        status: ConversationStatus;
        started_at: string;
        last_message_at: string | null;
    };
    messages: RhMessage[];
}

export interface SendRhMessageRequest {
    message: string;
    conversation_id?: string;
    project_id?: string;
    talent_id?: string;
}

export interface RhToolUsed {
    name: string;
    args: Record<string, unknown>;
    result_count: number;
}

export interface SendRhMessageResponse {
    status: "success";
    workflow: "WF_RH_Chat" | "WF_RH_Chat_v3_RAG_PRO";
    api_version: "v2" | "v3";
    conversation_id: string;
    project_id: string | null;
    reply: string;
    analyse: string;
    risques: string[];
    actions_recommandees: ActionRecommandee[];
    suggested_actions: RhSuggestedAction[];
    sources: SourceDB[];
    intent: RhIntent;
    confidence: number;
    confidence_explanation: string;
    quick_replies: string[];
    llm_enriched: boolean;
    source_agent?: string;
    citations?: string[];
    citations_rejected?: Array<{ raw: unknown; reason: string }>;
    tools_used?: RhToolUsed[];
    llm_meta?: {
        provider: "groq";
        model: string;
        rounds: 1 | 2;
        tools_called: number;
    };
    meta: {
        source_agent: string;
        computed_at: string;
        duration_ms?: number;
    };
}

export interface ParsedCitationV3 {
    raw: string;
    type: "talent" | "project" | "alert" | "decision" | "skill";
    id: string;
}

export function parseRhCitation(raw: string): ParsedCitationV3 | null {
    const m = raw.match(/^(talent|project|alert|decision|skill):([0-9a-f-]{36})$/i);
    if (!m) return null;
    return { raw, type: m[1] as ParsedCitationV3["type"], id: m[2].toLowerCase() };
}

export interface ArchiveRhConversationResponse {
    status: "success";
    action: "archived" | "restored";
    conversation: {
        id: string;
        status: ConversationStatus;
        title: string;
    };
}
