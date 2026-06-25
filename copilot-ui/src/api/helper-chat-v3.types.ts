export type CitationType = "talent" | "alert" | "decision" | "project" | "skill" | "arbitrage";

export interface Citation {
    type: CitationType;
    id: string;
    label: string;
}

export type SuggestedActionType =
    | "view_talent"
    | "view_alert"
    | "launch_simulation"
    | "assign_talent"
    | "view_arbitrage";

export interface SuggestedAction {
    type: SuggestedActionType;
    label: string;
    target_id: string;
    context?: string;
}

export interface KpiHighlight {
    viability?: number;
    alerts_active?: number;
    team_size?: number;
    days_to_milestone?: number;
    health_score?: number;
    budget_consumed_pct?: number;
}

export interface ToolUsed {
    name: string;
    args?: Record<string, unknown>;
    result_count: number;
}

export type ChatIntent =
    | "risk_inquiry"
    | "team_inquiry"
    | "project_inquiry"
    | "action_request"
    | "general_help";

export interface HelperChatV3Request {
    project_id?: string;
    conversation_id?: string;
    message: string;
}

export interface HelperChatV3Response {
    status: "success";
    workflow: "WF_Helper_Chat_v3_PRO";
    workflow_source: "WF_Helper_Chat_v3_PRO";
    run_status: "completed" | "failed";

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
    intent: ChatIntent;
    suggested_actions: SuggestedAction[];
    citations: Citation[];
    citations_rejected: Array<{ raw: unknown; reason: string }>;
    confidence: number;
    kpi_highlight: KpiHighlight | null;

    tools_used: ToolUsed[];
    has_tool_calls: boolean;

    llm_enriched: boolean;
    llm_meta: {
        provider: "groq";
        model: string;
        status: "success" | "failed";
        error: string | null;
        rounds: number;
        tools_called: number;
    };

    conversation: {
        id: string;
        message_count: number;
        last_message_at: string;
        was_created: boolean;
    };

    meta: {
        analysis_version: 3;
        scenario_type: "live";
        api_version: "v3";
        source_agent: "helper_chat_v3_pro";
        computed_at: string;
    };

    __duration_ms?: number;
}

export interface HelperChatV3Error {
    status: "error";
    workflow: "WF_Helper_Chat_v3_PRO";
    code: "VALIDATION_FAILED" | "CONVERSATION_NOT_FOUND" | "CONVERSATION_ARCHIVED";
    message: string;
    errors?: string[];
}
