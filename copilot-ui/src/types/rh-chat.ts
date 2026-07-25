/** WF_RH_Conversations + WF_RH_Chat — contrats API (affichage uniquement). */

export type RhChatConversationStatus = "active" | "archived";

export type RhChatConversationListItem = {
    id: string;
    title: string | null;
    last_message_at: string | null;
    last_message_preview: string | null;
    message_count: number;
    status: RhChatConversationStatus;
    manager_name?: string | null;
};

export type RhChatMessageRole = "user" | "assistant" | "system";

export type RhChatSuggestedAction = {
    label: string;
    type?: string;
    payload?: unknown;
};

export type RhChatSource = {
    type?: string;
    id?: string;
    label?: string;
};

export type RhChatMessage = {
    id: string;
    role: RhChatMessageRole;
    content: string;
    created_at: string | null;
    intent?: string | null;
    confidence?: number | null;
    suggested_actions?: RhChatSuggestedAction[];
    sources?: RhChatSource[];
    details?: string[] | unknown;
    quick_replies?: string[];
};

export type RhChatConversationDetail = {
    id: string;
    title: string | null;
    status: RhChatConversationStatus;
    manager_name?: string | null;
    messages: RhChatMessage[];
};

export type RhChatConversationsListParams = {
    status?: RhChatConversationStatus | "all";
    search?: string;
    limit?: number;
};

export type RhChatConversationsListResult = {
    count: number;
    conversations: RhChatConversationListItem[];
};

export type RhChatPostBody = {
    message: string;
    conversation_id?: string | null;
};

export type RhChatPostResult = {
    conversation_id: string;
    reply: string;
    intent?: string | null;
    details?: unknown;
    suggested_actions?: RhChatSuggestedAction[];
    sources?: RhChatSource[];
    confidence?: number | null;
    quick_replies?: string[];
    user_message_id?: string;
    assistant_message_id?: string;
};

/** Métadonnées assistant affichées dans le panneau « Analyse IA ». */
export type RhChatAnalysisMeta = {
    intent: string | null;
    confidence: number | null;
    sources: RhChatSource[];
    suggested_actions: RhChatSuggestedAction[];
    details: unknown;
};
