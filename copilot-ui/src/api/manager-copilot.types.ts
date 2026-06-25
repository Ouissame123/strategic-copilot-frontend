// ─────────── Conversation ───────────
export type ConversationStatus = "active" | "archived";

export interface ConversationSummary {
    id: string;
    project_id: string | null;
    project_name: string | null;
    title: string;
    message_count: number;
    status: ConversationStatus;
    started_at: string;
    last_message_at: string | null;
    last_message_preview: string | null;
    last_message_role: "user" | "assistant" | null;
    is_owner: boolean;
}

export interface ConversationsListResponse {
    status: "success";
    workflow: "WF_Manager_Conversations";
    enterprise_id: string;
    count: number;
    conversations: ConversationSummary[];
    distribution: {
        active: number;
        archived: number;
        with_project: number;
        generic: number;
    };
    filters_applied: {
        project_id: string | null;
        status: "active" | "archived" | "all";
        search: string | null;
        limit: number;
    } | null;
}

// ─────────── Message ───────────
export type MessageRole = "user" | "assistant";

export interface ToolUsed {
    name: string;
    args?: Record<string, unknown>;
    result_count: number;
}

export type SuggestedActionType =
    | "assign"
    | "training"
    | "review"
    | "view_talent"
    | "view_alert"
    | "launch_simulation";

export interface SuggestedAction {
    type: SuggestedActionType;
    label: string;
    target_id?: string;
    context?: string;
}

export interface HelperMessage {
    id: string;
    role: MessageRole;
    content: string;
    intent: string | null;
    sources: {
        citations?: string[];
        tools_used?: ToolUsed[];
    } | null;
    suggested_actions: SuggestedAction[] | null;
    confidence: number | null;
    llm_model: string | null;
    created_at: string;
    analysis_run_id: string | null;
}

export interface ConversationDetailResponse {
    status: "success";
    workflow: "WF_Manager_Conversations";
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
        is_owner: boolean;
    };
    messages: HelperMessage[];
}

// ─────────── Send Message (chat-v2) ───────────
export type CitationType = "talent" | "alert" | "decision" | "project" | "skill";

export interface SendMessageRequest {
    message: string;
    conversation_id?: string;
    project_id?: string;
}

export interface SendMessageResponse {
    status: "success";
    workflow: "WF_Helper_Chat_Senior_v2_RAG";
    enterprise_id: string;
    conversation_id: string;
    analysis_run_id: string;
    project_id: string | null;
    manager_user_id: string | null;
    user_message_id: string | null;
    assistant_message_id: string | null;
    user_message: string;
    reply: string;
    details: string[];
    intent: string;
    suggested_actions: SuggestedAction[];
    citations: string[];
    citations_rejected: Array<{ raw: unknown; reason: string }>;
    confidence: number;
    tools_used: ToolUsed[];
    has_tool_calls: boolean;
    llm_enriched: boolean;
    llm_meta: {
        provider: "groq";
        model: string;
        status: "success" | "failed";
        rounds: number;
        tools_called: number;
    };
    conversation: {
        id: string;
        message_count: number;
        last_message_at: string;
        was_created: boolean;
    };
    __duration_ms: number;
}

// ─────────── Archive ───────────
export interface ArchiveRequest {
    restore?: boolean;
}

export interface ArchiveResponse {
    status: "success";
    operation: "archive" | "restore";
    conversation: {
        id: string;
        status: ConversationStatus;
        project_id: string | null;
        title: string;
        message_count: number;
        updated_at: string;
    };
    action: "archived" | "restored";
}

// ─────────── Citations parsées ───────────
export interface ParsedCitation {
    raw: string;
    type: CitationType;
    id: string;
}

export function parseCitation(raw: string): ParsedCitation | null {
    const m = raw.match(/^(talent|alert|decision|project|skill):([0-9a-f-]{36})$/i);
    if (!m) return null;
    return {
        raw,
        type: m[1] as CitationType,
        id: m[2].toLowerCase(),
    };
}
