import { API_ROUTES } from "@/lib/api-routes";
import { normalizeHelperConversationId } from "@/lib/helper-conversation-id";
import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";
import type {
    ArchiveResponse,
    ConversationDetailResponse,
    ConversationStatus,
    ConversationSummary,
    ConversationsListResponse,
    HelperMessage,
    SendMessageRequest,
    SendMessageResponse,
    SuggestedAction,
    ToolUsed,
} from "./manager-copilot.types";

const silentCfg = { skipGlobalHttpErrorToast: true } satisfies HttpClientRequestConfig;

export interface ConversationsFilters {
    project_id?: string;
    status?: "active" | "archived" | "all";
    search?: string;
    limit?: number;
}

function asRecord(v: unknown): Record<string, unknown> {
    return v != null && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function parseToolsUsed(raw: unknown): ToolUsed[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((row) => row && typeof row === "object")
        .map((row) => {
            const r = row as Record<string, unknown>;
            return {
                name: String(r.name ?? ""),
                args: r.args && typeof r.args === "object" ? (r.args as Record<string, unknown>) : undefined,
                result_count: Number(r.result_count) || 0,
            };
        })
        .filter((t) => t.name);
}

function parseSuggestedActions(raw: unknown): SuggestedAction[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((row) => row && typeof row === "object")
        .map((row) => {
            const r = row as Record<string, unknown>;
            return {
                type: String(r.type ?? "review") as SuggestedAction["type"],
                label: String(r.label ?? ""),
                target_id: r.target_id != null ? String(r.target_id) : undefined,
                context: r.context != null ? String(r.context) : undefined,
            };
        })
        .filter((a) => a.label);
}

function mapConversationSummary(item: Record<string, unknown>): ConversationSummary | null {
    const id = String(item.id ?? "").trim();
    if (!id) return null;
    const status: ConversationStatus = item.status === "archived" ? "archived" : "active";
    const lastRole = String(item.last_message_role ?? "").toLowerCase();
    return {
        id,
        project_id: item.project_id != null ? String(item.project_id) : null,
        project_name: item.project_name != null ? String(item.project_name) : null,
        title: String(item.title ?? "Conversation"),
        message_count: Number(item.message_count) || 0,
        status,
        started_at: String(item.started_at ?? item.created_at ?? new Date().toISOString()),
        last_message_at: item.last_message_at != null ? String(item.last_message_at) : null,
        last_message_preview: item.last_message_preview != null ? String(item.last_message_preview) : null,
        last_message_role:
            lastRole === "user" || lastRole === "assistant" ? lastRole : null,
        is_owner: item.is_owner !== false,
    };
}

function computeDistribution(conversations: ConversationSummary[]) {
    let active = 0;
    let archived = 0;
    let with_project = 0;
    let generic = 0;
    for (const c of conversations) {
        if (c.status === "archived") archived++;
        else active++;
        if (c.project_id) with_project++;
        else generic++;
    }
    return { active, archived, with_project, generic };
}

function normalizeListResponse(data: unknown, filters: ConversationsFilters): ConversationsListResponse {
    const root = asRecord(data);
    const block =
        Array.isArray(root.conversations) || root.count != null
            ? root
            : asRecord(root.data);

    const rawList = Array.isArray(block.conversations)
        ? block.conversations
        : Array.isArray(block.items)
          ? block.items
          : [];

    const conversations = rawList
        .map((item) => mapConversationSummary(asRecord(item)))
        .filter((c): c is ConversationSummary => c !== null);

    const distRaw = asRecord(block.distribution);
    const distribution =
        typeof distRaw.active === "number"
            ? {
                  active: Number(distRaw.active) || 0,
                  archived: Number(distRaw.archived) || 0,
                  with_project: Number(distRaw.with_project) || 0,
                  generic: Number(distRaw.generic) || 0,
              }
            : computeDistribution(conversations);

    return {
        status: "success",
        workflow: "WF_Manager_Conversations",
        enterprise_id: String(block.enterprise_id ?? root.enterprise_id ?? ""),
        count: typeof block.count === "number" ? block.count : conversations.length,
        conversations,
        distribution,
        filters_applied: {
            project_id: filters.project_id ?? null,
            status: filters.status ?? "active",
            search: filters.search ?? null,
            limit: filters.limit ?? 50,
        },
    };
}

function mapHelperMessage(row: Record<string, unknown>, conversationId: string): HelperMessage | null {
    const id = String(row.id ?? "").trim();
    const content = String(row.content ?? row.message ?? "").trim();
    if (!id || !content) return null;

    const roleRaw = String(row.role ?? "user").toLowerCase();
    const role: HelperMessage["role"] = roleRaw === "assistant" ? "assistant" : "user";

    const citations = Array.isArray(row.citations)
        ? row.citations.map((c) => String(c ?? "")).filter(Boolean)
        : Array.isArray(asRecord(row.sources).citations)
          ? (asRecord(row.sources).citations as unknown[]).map((c) => String(c ?? "")).filter(Boolean)
          : undefined;

    const toolsUsed = parseToolsUsed(row.tools_used ?? asRecord(row.sources).tools_used);

    return {
        id,
        role,
        content,
        intent: row.intent != null ? String(row.intent) : null,
        sources:
            citations?.length || toolsUsed.length
                ? { citations, tools_used: toolsUsed.length ? toolsUsed : undefined }
                : null,
        suggested_actions: (() => {
            const actions = parseSuggestedActions(row.suggested_actions);
            return actions.length ? actions : null;
        })(),
        confidence: typeof row.confidence === "number" ? row.confidence : null,
        llm_model: row.llm_model != null ? String(row.llm_model) : null,
        created_at: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
        analysis_run_id: row.analysis_run_id != null ? String(row.analysis_run_id) : null,
    };
}

function normalizeDetailResponse(data: unknown): ConversationDetailResponse {
    const root = asRecord(data);
    const block =
        root.conversation != null || Array.isArray(root.messages) ? root : asRecord(root.data);
    const convRaw = asRecord(block.conversation);

    const conversation = {
        id: String(convRaw.id ?? "").trim(),
        project_id: convRaw.project_id != null ? String(convRaw.project_id) : null,
        project_name: convRaw.project_name != null ? String(convRaw.project_name) : null,
        manager_user_id: convRaw.manager_user_id != null ? String(convRaw.manager_user_id) : null,
        title: String(convRaw.title ?? "Conversation"),
        message_count: Number(convRaw.message_count) || 0,
        status: (convRaw.status === "archived" ? "archived" : "active") as ConversationStatus,
        started_at: String(convRaw.started_at ?? convRaw.created_at ?? new Date().toISOString()),
        last_message_at: convRaw.last_message_at != null ? String(convRaw.last_message_at) : null,
        is_owner: convRaw.is_owner !== false,
    };

    const rawMessages = Array.isArray(block.messages) ? block.messages : [];
    const messages = rawMessages
        .map((row) => mapHelperMessage(asRecord(row), conversation.id))
        .filter((m): m is HelperMessage => m !== null)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return {
        status: "success",
        workflow: "WF_Manager_Conversations",
        enterprise_id: String(block.enterprise_id ?? root.enterprise_id ?? ""),
        conversation,
        messages,
    };
}

function normalizeSendResponse(data: unknown): SendMessageResponse {
    const root = asRecord(data);
    const block = root.conversation_id != null || root.reply != null ? root : asRecord(root.data);
    const conv = asRecord(block.conversation);

    return {
        status: "success",
        workflow: "WF_Helper_Chat_Senior_v2_RAG",
        enterprise_id: String(block.enterprise_id ?? ""),
        conversation_id: String(block.conversation_id ?? conv.id ?? ""),
        analysis_run_id: String(block.analysis_run_id ?? ""),
        project_id: block.project_id != null ? String(block.project_id) : null,
        manager_user_id: block.manager_user_id != null ? String(block.manager_user_id) : null,
        user_message_id: block.user_message_id != null ? String(block.user_message_id) : null,
        assistant_message_id: block.assistant_message_id != null ? String(block.assistant_message_id) : null,
        user_message: String(block.user_message ?? ""),
        reply: String(block.reply ?? block.output ?? ""),
        details: Array.isArray(block.details) ? block.details.map((d) => String(d ?? "")) : [],
        intent: String(block.intent ?? ""),
        suggested_actions: parseSuggestedActions(block.suggested_actions),
        citations: Array.isArray(block.citations) ? block.citations.map((c) => String(c ?? "")) : [],
        citations_rejected: Array.isArray(block.citations_rejected)
            ? (block.citations_rejected as Array<{ raw: unknown; reason: string }>)
            : [],
        confidence: typeof block.confidence === "number" ? block.confidence : 0,
        tools_used: parseToolsUsed(block.tools_used),
        has_tool_calls: block.has_tool_calls === true,
        llm_enriched: block.llm_enriched === true,
        llm_meta: {
            provider: "groq",
            model: String(asRecord(block.llm_meta).model ?? ""),
            status: asRecord(block.llm_meta).status === "failed" ? "failed" : "success",
            rounds: Number(asRecord(block.llm_meta).rounds) || 0,
            tools_called: Number(asRecord(block.llm_meta).tools_called) || 0,
        },
        conversation: {
            id: String(conv.id ?? block.conversation_id ?? ""),
            message_count: Number(conv.message_count) || 0,
            last_message_at: String(conv.last_message_at ?? new Date().toISOString()),
            was_created: conv.was_created === true,
        },
        __duration_ms: Number(block.__duration_ms) || 0,
    };
}

function normalizeArchiveResponse(data: unknown): ArchiveResponse {
    const root = asRecord(data);
    const block = root.conversation != null ? root : asRecord(root.data);
    const conv = asRecord(block.conversation);
    const action = block.action === "restored" || block.operation === "restore" ? "restored" : "archived";

    return {
        status: "success",
        operation: action === "restored" ? "restore" : "archive",
        conversation: {
            id: String(conv.id ?? ""),
            status: conv.status === "archived" ? "archived" : "active",
            project_id: conv.project_id != null ? String(conv.project_id) : null,
            title: String(conv.title ?? ""),
            message_count: Number(conv.message_count) || 0,
            updated_at: String(conv.updated_at ?? new Date().toISOString()),
        },
        action,
    };
}

export async function fetchConversations(filters: ConversationsFilters = {}): Promise<ConversationsListResponse> {
    const { data } = await httpClient.get(API_ROUTES.conversationsList(), {
        params: filters,
        ...silentCfg,
    });
    return normalizeListResponse(data, filters);
}

export async function fetchConversationDetail(id: string, messagesLimit = 100): Promise<ConversationDetailResponse> {
    const cid = normalizeHelperConversationId(id);
    const { data } = await httpClient.get(API_ROUTES.conversationDetail(cid), {
        params: { messages_limit: messagesLimit },
        ...silentCfg,
    });
    return normalizeDetailResponse(data);
}

export async function sendMessage(req: SendMessageRequest): Promise<SendMessageResponse> {
    const { data } = await httpClient.post<unknown>(API_ROUTES.helperChat(), {
        message: req.message,
        ...(req.conversation_id ? { conversation_id: req.conversation_id } : {}),
        ...(req.project_id ? { project_id: req.project_id } : {}),
    });
    return normalizeSendResponse(data);
}

export async function archiveConversation(id: string, restore = false): Promise<ArchiveResponse> {
    const cid = normalizeHelperConversationId(id);
    const { data } = await httpClient.patch(API_ROUTES.conversationArchive(cid), { restore }, silentCfg);
    return normalizeArchiveResponse(data);
}
