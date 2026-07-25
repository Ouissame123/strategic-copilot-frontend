import { orderRhChatMessagesForDisplay } from "@/services/rh-chat/rh-chat-message-state";
import type {
    RhChatAnalysisMeta,
    RhChatConversationDetail,
    RhChatConversationListItem,
    RhChatConversationsListResult,
    RhChatConversationStatus,
    RhChatMessage,
    RhChatPostResult,
    RhChatSuggestedAction,
    RhChatSource,
} from "@/types/rh-chat";

function asRecord(v: unknown): Record<string, unknown> {
    return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function normalizeStatus(raw: unknown): RhChatConversationStatus {
    return str(raw).toLowerCase() === "archived" ? "archived" : "active";
}

function normalizeSuggestedActions(raw: unknown): RhChatSuggestedAction[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            if (typeof item === "string") return { label: item };
            const o = asRecord(item);
            const label = str(o.label ?? o.name ?? o.title);
            if (!label) return null;
            return { label, type: str(o.type) || undefined, payload: o.payload };
        })
        .filter((x): x is RhChatSuggestedAction => x != null);
}

function normalizeSources(raw: unknown): RhChatSource[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            const o = asRecord(item);
            const label = str(o.label ?? o.name);
            if (!label && !o.id) return null;
            return {
                type: str(o.type) || undefined,
                id: str(o.id) || undefined,
                label: label || undefined,
            };
        })
        .filter((x): x is RhChatSource => x != null);
}

export function parseRhChatMessage(raw: unknown, fallbackId: string): RhChatMessage | null {
    const o = asRecord(raw);
    const content = str(o.content ?? o.message ?? o.text ?? o.reply);
    const roleRaw = str(o.role).toLowerCase();
    const role: RhChatMessage["role"] =
        roleRaw === "assistant" || roleRaw === "system" ? roleRaw : "user";
    if (!content && role !== "system") return null;

    const conf = o.confidence;
    const confidence =
        typeof conf === "number" && Number.isFinite(conf) ? conf : conf != null ? Number(conf) : null;

    return {
        id: str(o.id) || fallbackId,
        role,
        content: content || "—",
        created_at: str(o.created_at ?? o.timestamp) || null,
        intent: str(o.intent) || null,
        confidence: Number.isFinite(confidence as number) ? (confidence as number) : null,
        suggested_actions: normalizeSuggestedActions(o.suggested_actions ?? o.actions),
        sources: normalizeSources(o.sources),
        details: o.details,
        quick_replies: Array.isArray(o.quick_replies)
            ? (o.quick_replies as unknown[]).map((q) => str(q)).filter(Boolean)
            : undefined,
    };
}

export function parseRhChatConversationsList(raw: unknown): RhChatConversationsListResult {
    const root = asRecord(raw);
    const data = asRecord(root.data);
    const merged = { ...data, ...root };
    const rawList = Array.isArray(merged.conversations)
        ? merged.conversations
        : Array.isArray(merged.items)
          ? merged.items
          : [];

    const conversations: RhChatConversationListItem[] = rawList
        .map((item, i) => {
            const o = asRecord(item);
            const id = str(o.id ?? o.conversation_id);
            if (!id) return null;
            return {
                id,
                title: str(o.title) || null,
                last_message_at: str(o.last_message_at ?? o.updated_at) || null,
                last_message_preview: str(o.last_message_preview ?? o.preview ?? o.last_message) || null,
                message_count: Number(o.message_count) || 0,
                status: normalizeStatus(o.status),
                manager_name: str(o.manager_name ?? o.manager) || null,
            };
        })
        .filter((x): x is RhChatConversationListItem => x != null);

    return {
        count: Number(merged.count) || conversations.length,
        conversations,
    };
}

export function parseRhChatConversationDetail(raw: unknown, id: string): RhChatConversationDetail {
    const root = asRecord(raw);
    const data = asRecord(root.data);
    const merged = { ...data, ...root };
    const convRaw = asRecord(merged.conversation);
    const conv = Object.keys(convRaw).length ? convRaw : merged;

    const rawMessages = Array.isArray(merged.messages) ? merged.messages : [];
    const messages = orderRhChatMessagesForDisplay(
        rawMessages
            .map((m) => {
                const o = asRecord(m);
                const roleRaw = str(o.role).toLowerCase();
                const role = roleRaw === "assistant" || roleRaw === "system" ? roleRaw : "user";
                const createdAt = str(o.created_at ?? o.timestamp) || new Date().toISOString();
                return parseRhChatMessage(m, `${role}_${createdAt}`);
            })
            .filter((x): x is RhChatMessage => x != null),
    );

    return {
        id: str(conv.id ?? conv.conversation_id) || id,
        title: str(conv.title) || null,
        status: normalizeStatus(conv.status),
        manager_name: str(conv.manager_name ?? conv.manager) || null,
        messages,
    };
}

export function parseRhChatPostResponse(raw: unknown): RhChatPostResult {
    const root = asRecord(raw);
    const data = asRecord(root.data);
    const merged = { ...data, ...root };
    const assistant = asRecord(merged.assistant_message);
    const userMsg = asRecord(merged.user_message);

    return {
        conversation_id: str(merged.session_id ?? merged.conversation_id ?? merged.conversationId),
        reply: str(merged.reply ?? assistant.content ?? merged.message ?? merged.output ?? merged.response),
        intent: str(merged.intent) || null,
        details: merged.details,
        suggested_actions: normalizeSuggestedActions(merged.suggested_actions),
        sources: normalizeSources(merged.sources),
        confidence:
            typeof merged.confidence === "number" && Number.isFinite(merged.confidence)
                ? merged.confidence
                : merged.confidence != null
                  ? Number(merged.confidence)
                  : null,
        quick_replies: Array.isArray(merged.quick_replies)
            ? (merged.quick_replies as unknown[]).map((q) => str(q)).filter(Boolean)
            : undefined,
        user_message_id: str(userMsg.id) || undefined,
        assistant_message_id: str(assistant.id) || undefined,
    };
}

export function analysisMetaFromPost(result: RhChatPostResult): RhChatAnalysisMeta {
    return {
        intent: result.intent ?? null,
        confidence: result.confidence ?? null,
        sources: result.sources ?? [],
        suggested_actions: result.suggested_actions ?? [],
        details: result.details ?? [],
    };
}

export function analysisMetaFromMessage(msg: RhChatMessage | null): RhChatAnalysisMeta | null {
    if (!msg || msg.role !== "assistant") return null;
    return {
        intent: msg.intent ?? null,
        confidence: msg.confidence ?? null,
        sources: msg.sources ?? [],
        suggested_actions: msg.suggested_actions ?? [],
        details: msg.details ?? [],
    };
}

export function lastAssistantMessage(messages: RhChatMessage[]): RhChatMessage | null {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant") return messages[i];
    }
    return null;
}

export function formatRhChatTime(iso: string | null | undefined): string {
    if (!iso?.trim()) return "—";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "—";
    return new Date(iso).toLocaleString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatConfidencePct(confidence: number | null | undefined): string | null {
    if (confidence == null || !Number.isFinite(confidence)) return null;
    const pct = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
    return `${pct} %`;
}
