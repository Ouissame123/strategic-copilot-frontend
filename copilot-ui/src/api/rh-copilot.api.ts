import { API_ROUTES } from "@/lib/api-routes";
import { FEATURES } from "@/lib/feature-flags";
import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";
import type {
    ActionPriorite,
    ActionRecommandee,
    ArchiveRhConversationResponse,
    ConversationScope,
    ConversationStatus,
    RhConversationDetailResponse,
    RhConversationsListResponse,
    RhConversationSummary,
    RhMessage,
    RhSuggestedAction,
    RhToolUsed,
    SendRhMessageRequest,
    SendRhMessageResponse,
    SourceDB,
} from "./rh-copilot.types";
import { parseRhIntent, type RhIntent } from "./rh-copilot.types";

const silentCfg = { skipGlobalHttpErrorToast: true } satisfies HttpClientRequestConfig;

export interface RhConversationsFilters {
    project_id?: string;
    status?: "active" | "archived" | "all";
    scope?: ConversationScope;
    search?: string;
    manager_user_id?: string;
    limit?: number;
}

function asRecord(v: unknown): Record<string, unknown> {
    return v != null && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function parseSources(raw: unknown): SourceDB[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            const o = asRecord(item);
            const table = str(o.table ?? o.label ?? o.type ?? o.name);
            if (!table) return null;
            return { table, count: Number(o.count ?? o.result_count ?? 1) || 0 };
        })
        .filter((s): s is SourceDB => s !== null);
}

function parseSuggestedActions(raw: unknown): RhSuggestedAction[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            if (typeof item === "string") return { label: item, type: "action" };
            const o = asRecord(item);
            const label = str(o.label ?? o.name);
            if (!label) return null;
            return {
                label,
                type: str(o.type) || "action",
                target_id: str(o.target_id) || undefined,
                context: str(o.context) || undefined,
            };
        })
        .filter((a): a is RhSuggestedAction => a !== null);
}

function parseActionsRecommandees(raw: unknown): ActionRecommandee[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            const o = asRecord(item);
            const action = str(o.action ?? o.label);
            if (!action) return null;
            const prioriteRaw = str(o.priorite ?? o.priority).toLowerCase();
            const priorite: ActionPriorite =
                prioriteRaw === "urgent" ? "urgent" : prioriteRaw === "low" ? "low" : "normal";
            return {
                priorite,
                action,
                impact: str(o.impact ?? o.description) || "—",
            };
        })
        .filter((a): a is ActionRecommandee => a !== null);
}

function parseToolsUsed(raw: unknown): RhToolUsed[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            const o = asRecord(item);
            const name = str(o.name);
            if (!name) return null;
            return {
                name,
                args: o.args && typeof o.args === "object" ? (o.args as Record<string, unknown>) : {},
                result_count: Number(o.result_count) || 0,
            };
        })
        .filter((t): t is RhToolUsed => t !== null);
}

function parseRisques(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((r) => str(r)).filter(Boolean);
}

function mapConversationSummary(item: Record<string, unknown>): RhConversationSummary | null {
    const id = str(item.id ?? item.conversation_id);
    if (!id) return null;
    const scopeRaw = str(item.scope).toLowerCase();
    const scope: ConversationScope =
        scopeRaw === "manager" ? "manager" : scopeRaw === "all" ? "all" : "rh";
    const lastRole = str(item.last_message_role).toLowerCase();
    const msgCounts = asRecord(item.messages);

    return {
        id,
        project_id: str(item.project_id) || null,
        project_name: str(item.project_name) || null,
        manager_user_id: str(item.manager_user_id) || null,
        manager_name: str(item.manager_name ?? item.manager) || null,
        manager_email: str(item.manager_email) || null,
        title: str(item.title) || "Conversation RH",
        message_count: Number(item.message_count) || 0,
        status: str(item.status).toLowerCase() === "archived" ? "archived" : "active",
        scope,
        started_at: str(item.started_at ?? item.created_at) || new Date().toISOString(),
        last_message_at: str(item.last_message_at ?? item.updated_at) || null,
        last_message_preview: str(item.last_message_preview ?? item.preview) || null,
        last_message_role: lastRole === "user" || lastRole === "assistant" ? lastRole : null,
        last_intent: parseRhIntent(item.last_intent ?? item.intent),
        last_confidence:
            typeof item.last_confidence === "number"
                ? item.last_confidence
                : typeof item.confidence === "number"
                  ? item.confidence
                  : null,
        avg_confidence: typeof item.avg_confidence === "number" ? item.avg_confidence : null,
        messages: {
            user: Number(msgCounts.user) || 0,
            assistant: Number(msgCounts.assistant) || 0,
        },
    };
}

function normalizeListResponse(data: unknown, filters: RhConversationsFilters): RhConversationsListResponse {
    const root = asRecord(data);
    const block = Array.isArray(root.conversations) ? root : asRecord(root.data);
    const rawList = Array.isArray(block.conversations)
        ? block.conversations
        : Array.isArray(block.items)
          ? block.items
          : [];

    const conversations = rawList
        .map((item) => mapConversationSummary(asRecord(item)))
        .filter((c): c is RhConversationSummary => c !== null);

    const distRaw = asRecord(block.distribution);
    let active = 0;
    let archived = 0;
    let with_project = 0;
    for (const c of conversations) {
        if (c.status === "archived") archived++;
        else active++;
        if (c.project_id) with_project++;
    }

    return {
        status: "success",
        enterprise_id: str(block.enterprise_id ?? root.enterprise_id),
        count: Number(block.count) || conversations.length,
        conversations,
        distribution: {
            active: Number(distRaw.active) || active,
            archived: Number(distRaw.archived) || archived,
            with_project: Number(distRaw.with_project) || with_project,
            by_intent:
                distRaw.by_intent && typeof distRaw.by_intent === "object"
                    ? (distRaw.by_intent as Record<string, number>)
                    : {},
        },
    };
}

function mapRhMessage(row: Record<string, unknown>, fallbackId: string): RhMessage | null {
    const content = str(row.content ?? row.message ?? row.reply);
    const roleRaw = str(row.role).toLowerCase();
    const role: RhMessage["role"] = roleRaw === "assistant" ? "assistant" : "user";
    if (!content) return null;

    return {
        id: str(row.id) || fallbackId,
        role,
        content,
        intent: parseRhIntent(row.intent),
        sources: (() => {
            const parsed = parseSources(row.sources);
            return parsed.length ? parsed : null;
        })(),
        suggested_actions: (() => {
            const parsed = parseSuggestedActions(row.suggested_actions);
            return parsed.length ? parsed : null;
        })(),
        confidence: typeof row.confidence === "number" ? row.confidence : null,
        llm_model: str(row.llm_model) || null,
        created_at: str(row.created_at ?? row.timestamp) || new Date().toISOString(),
        analysis_run_id: str(row.analysis_run_id) || null,
        analyse: str(row.analyse) || null,
        risques: parseRisques(row.risques),
        actions_recommandees: parseActionsRecommandees(row.actions_recommandees),
        quick_replies: Array.isArray(row.quick_replies)
            ? (row.quick_replies as unknown[]).map((q) => str(q)).filter(Boolean)
            : undefined,
    };
}

function normalizeDetailResponse(data: unknown, id: string): RhConversationDetailResponse {
    const root = asRecord(data);
    const block = root.conversation != null || Array.isArray(root.messages) ? root : asRecord(root.data);
    const convRaw = asRecord(block.conversation);
    const conv = Object.keys(convRaw).length ? convRaw : block;

    const rawMessages = Array.isArray(block.messages) ? block.messages : [];
    const messages = rawMessages
        .map((row, i) => mapRhMessage(asRecord(row), `msg-${i}`))
        .filter((m): m is RhMessage => m !== null)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return {
        status: "success",
        enterprise_id: str(block.enterprise_id ?? root.enterprise_id),
        conversation: {
            id: str(conv.id ?? conv.conversation_id) || id,
            project_id: str(conv.project_id) || null,
            project_name: str(conv.project_name) || null,
            manager_user_id: str(conv.manager_user_id) || null,
            title: str(conv.title) || "Conversation RH",
            message_count: Number(conv.message_count) || messages.length,
            status: (str(conv.status).toLowerCase() === "archived" ? "archived" : "active") as ConversationStatus,
            started_at: str(conv.started_at ?? conv.created_at) || new Date().toISOString(),
            last_message_at: str(conv.last_message_at) || null,
        },
        messages,
    };
}

function normalizeSendResponse(data: unknown): SendRhMessageResponse {
    const root = asRecord(data);
    const block = root.reply != null ? root : asRecord(root.data);
    const intent = parseRhIntent(block.intent) ?? "aide_generale";
    const meta = asRecord(block.meta);
    const workflowRaw = str(block.workflow);
    const isV3 = workflowRaw.includes("v3") || str(block.api_version) === "v3";
    const sourceAgent = str(block.source_agent ?? meta.source_agent);
    const llmMetaRaw = asRecord(block.llm_meta);

    return {
        status: "success",
        workflow: isV3 ? "WF_RH_Chat_v3_RAG_PRO" : "WF_RH_Chat",
        api_version: isV3 ? "v3" : "v2",
        conversation_id: str(block.conversation_id ?? block.conversationId),
        project_id: str(block.project_id) || null,
        reply: str(block.reply ?? block.message ?? block.output),
        analyse: str(block.analyse ?? block.analysis),
        risques: parseRisques(block.risques),
        actions_recommandees: parseActionsRecommandees(block.actions_recommandees),
        suggested_actions: parseSuggestedActions(block.suggested_actions),
        sources: parseSources(block.sources),
        intent,
        confidence: typeof block.confidence === "number" ? block.confidence : 0,
        confidence_explanation: str(block.confidence_explanation),
        quick_replies: Array.isArray(block.quick_replies)
            ? (block.quick_replies as unknown[]).map((q) => str(q)).filter(Boolean)
            : [],
        llm_enriched: block.llm_enriched === true,
        source_agent: sourceAgent || undefined,
        citations: Array.isArray(block.citations)
            ? (block.citations as unknown[]).map((c) => str(c)).filter(Boolean)
            : undefined,
        citations_rejected: Array.isArray(block.citations_rejected)
            ? (block.citations_rejected as Array<{ raw: unknown; reason: string }>)
            : undefined,
        tools_used: (() => {
            const parsed = parseToolsUsed(block.tools_used);
            return parsed.length ? parsed : undefined;
        })(),
        llm_meta: llmMetaRaw.model
            ? {
                  provider: "groq",
                  model: str(llmMetaRaw.model),
                  rounds: (Number(llmMetaRaw.rounds) === 2 ? 2 : 1) as 1 | 2,
                  tools_called: Number(llmMetaRaw.tools_called) || 0,
              }
            : undefined,
        meta: {
            source_agent: sourceAgent,
            computed_at: str(meta.computed_at) || new Date().toISOString(),
            duration_ms:
                typeof meta.duration_ms === "number"
                    ? meta.duration_ms
                    : typeof block.__duration_ms === "number"
                      ? block.__duration_ms
                      : undefined,
        },
    };
}

function normalizeArchiveResponse(data: unknown): ArchiveRhConversationResponse {
    const root = asRecord(data);
    const block = root.conversation != null ? root : asRecord(root.data);
    const conv = asRecord(block.conversation);
    const action = block.action === "restored" || block.operation === "restore" ? "restored" : "archived";

    return {
        status: "success",
        action,
        conversation: {
            id: str(conv.id),
            status: str(conv.status).toLowerCase() === "archived" ? "archived" : "active",
            title: str(conv.title),
        },
    };
}

export async function fetchRhConversations(filters: RhConversationsFilters = {}): Promise<RhConversationsListResponse> {
    const { data } = await httpClient.get(API_ROUTES.rhConversationsList(), { params: filters, ...silentCfg });
    return normalizeListResponse(data, filters);
}

export async function fetchRhConversationDetail(id: string, messagesLimit = 100): Promise<RhConversationDetailResponse> {
    const cid = id.trim();
    const { data } = await httpClient.get(API_ROUTES.rhConversationDetail(cid), {
        params: { messages_limit: messagesLimit },
        ...silentCfg,
    });
    return normalizeDetailResponse(data, cid);
}

export async function sendRhMessage(req: SendRhMessageRequest): Promise<SendRhMessageResponse> {
    const body: Record<string, string> = { message: req.message.trim() };
    if (req.conversation_id?.trim()) body.conversation_id = req.conversation_id.trim();
    if (req.project_id?.trim()) body.project_id = req.project_id.trim();
    if (req.talent_id?.trim()) body.talent_id = req.talent_id.trim();

    const route = FEATURES.USE_RH_CHAT_V3_RAG ? API_ROUTES.rhChatV3() : API_ROUTES.rhChat();
    const { data } = await httpClient.post<unknown>(route, body);
    return normalizeSendResponse(data);
}

export async function archiveRhConversation(id: string, restore = false): Promise<ArchiveRhConversationResponse> {
    const { data } = await httpClient.patch(API_ROUTES.rhConversationArchive(id.trim()), { restore }, silentCfg);
    return normalizeArchiveResponse(data);
}
