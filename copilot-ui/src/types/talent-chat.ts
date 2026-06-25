export interface ChatSession {
    id: string;
    title: string;
    is_archived: boolean;
    message_count: number;
    last_message_at: string | null;
    created_at: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at: string;
    model?: string;
}

export interface SendMessageResponse {
    session_id: string;
    user_message: ChatMessage;
    assistant_message: ChatMessage;
    session: { message_count: number; last_message_at: string; title: string };
}

export interface ChatSessionDetail {
    session: ChatSession;
    messages: ChatMessage[];
}
