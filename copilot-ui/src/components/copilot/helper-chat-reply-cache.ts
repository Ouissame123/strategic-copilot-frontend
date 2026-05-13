import { isAxiosError, type AxiosError } from "axios";
import type { ChatMessage, ChatReply, Conversation } from "@/services/chat.api";

export { HELPER_CHAT_UUID_RE, isHelperChatUuid, normalizeHelperConversationId } from "@/lib/helper-conversation-id";

export type ConversationDetailCache = { conversation: Conversation; messages: ChatMessage[] };

/**
 * Fusionne une réponse POST helper chat dans le cache React Query `["chat-conversation", id]`.
 * Même logique que l’historique Helper manager (dédoublonnage + tri chronologique).
 */
export function mergeHelperChatReplyIntoConversationCache(oldData: unknown, reply: ChatReply): ConversationDetailCache {
    const typedOld = oldData as ConversationDetailCache | undefined;
    const oldMessages = Array.isArray(typedOld?.messages) ? typedOld.messages : [];
    const nowIso = new Date().toISOString();

    const userMsg: ChatMessage = {
        id: reply.user_message_id,
        conversation_id: reply.conversation_id,
        role: "user",
        content: reply.user_message,
        created_at: nowIso,
    };

    const suggestedFromReply = Array.isArray(reply.suggested_actions)
        ? reply.suggested_actions
              .map((a) => ({
                  label: String(a?.label ?? "").trim(),
                  type: String(a?.type ?? "").trim(),
                  payload: a?.payload,
                  target_id: typeof a?.target_id === "string" ? a.target_id : undefined,
                  duration_days: typeof a?.duration_days === "number" ? a.duration_days : undefined,
              }))
              .filter((a) => a.label)
        : [];

    const detailsFromReply = Array.isArray(reply.details)
        ? reply.details.map((d) => String(d ?? "").trim()).filter(Boolean)
        : [];

    const sourcesFromReply = Array.isArray(reply.sources)
        ? reply.sources
              .map((s) => ({
                  type: String((s as { type?: unknown }).type ?? "unknown"),
                  id: String((s as { id?: unknown }).id ?? "").trim(),
                  label: String((s as { label?: unknown }).label ?? "").trim() || "Source",
              }))
              .filter((s) => s.id.length > 0)
        : [];

    const assistantMsg: ChatMessage = {
        id: reply.assistant_message_id,
        conversation_id: reply.conversation_id,
        role: "assistant",
        content: reply.reply,
        intent: reply.intent,
        confidence: reply.confidence,
        suggested_actions: suggestedFromReply.length ? suggestedFromReply : undefined,
        details: detailsFromReply.length ? detailsFromReply : undefined,
        sources: sourcesFromReply.length ? sourcesFromReply : undefined,
        created_at: nowIso,
    };

    const allMessages = [...oldMessages, userMsg, assistantMsg];
    const dedupedMap = new Map<string, ChatMessage>();
    for (const m of allMessages) dedupedMap.set(m.id, m);
    const dedupedMessages = Array.from(dedupedMap.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    return {
        conversation:
            typedOld?.conversation ??
            ({
                id: reply.conversation_id,
                title: (reply.user_message || "Nouvelle conversation").slice(0, 40),
                project_id: reply.context_used?.project_id ?? null,
                project_name: undefined,
                message_count: dedupedMessages.length,
                status: "active" as const,
                created_at: nowIso,
                last_message_at: nowIso,
            } satisfies Conversation),
        messages: dedupedMessages,
    };
}

function pickTrimmed(v: unknown, max: number): string {
    if (v == null) return "";
    if (typeof v === "object" && v !== null && "message" in (v as Record<string, unknown>)) {
        const nested = pickTrimmed((v as Record<string, unknown>).message, max);
        if (nested) return nested;
    }
    const s = String(v).trim();
    if (!s) return "";
    return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Extrait un libellé lisible depuis le corps de réponse (n8n, Express, proxy, etc.). */
function readAxiosResponseDetail(err: AxiosError): string {
    const data = err.response?.data;
    if (data == null || data === "") return "";
    if (typeof data === "string") {
        const s = data.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        return s.length > 320 ? `${s.slice(0, 320)}…` : s;
    }
    if (typeof data === "object") {
        const o = data as Record<string, unknown>;
        const msg = pickTrimmed(o.message, 400);
        const desc = pickTrimmed(o.description ?? o.hint ?? o.detail, 400);
        const errField = o.error;
        const errStr = typeof errField === "string" ? pickTrimmed(errField, 200) : "";
        const errNested =
            typeof errField === "object" && errField !== null
                ? pickTrimmed((errField as Record<string, unknown>).message, 400)
                : "";
        const code = pickTrimmed(o.code ?? o.errorCode, 120);

        const pieces = [code, errStr, errNested, msg || desc].filter(Boolean);
        const deduped: string[] = [];
        for (const p of pieces) {
            if (!deduped.some((x) => x === p || x.includes(p) || p.includes(x))) deduped.push(p);
        }
        const combined = deduped.join(" — ");
        if (combined) return combined.slice(0, 420);
        try {
            const j = JSON.stringify(data);
            return j.length > 280 ? `${j.slice(0, 280)}…` : j;
        } catch {
            return "";
        }
    }
    return String(data).slice(0, 200);
}

/** Erreur HTTP après `PATCH /webhook/manager/conversations/:id/archive` (archivage logique, pas DELETE). */
export function friendlyArchiveConversationError(err: unknown): string {
    if (!isAxiosError(err)) return "Erreur lors de l’archivage de la conversation.";
    const status = err.response?.status;
    const detail = readAxiosResponseDetail(err);

    if (status === 404) {
        return detail ? `Conversation introuvable ou hors périmètre. (${detail})` : "Conversation introuvable ou hors périmètre.";
    }
    if (status === 403) {
        return detail ? `Accès refusé : ${detail}` : "Accès refusé : tu ne peux pas archiver cette conversation.";
    }
    if (status === 405) {
        return "Le serveur n’accepte pas PATCH sur cette URL. Dans n8n, vérifie que le nœud Webhook autorise bien la méthode PATCH pour `/manager/conversations/:id/archive`.";
    }
    if (status === 400) {
        return detail || "Requête refusée. Vérifie que la conversation existe et que ton compte y a accès.";
    }
    if (status === 502 || status === 503 || status === 504) {
        return detail
            ? `Service temporairement indisponible (${status}) : ${detail}`
            : `Service temporairement indisponible (${status}). Le proxy ou n8n ne répond pas — réessaie plus tard.`;
    }
    if (status != null && status >= 500) {
        return detail
            ? `Erreur serveur lors de l’archivage (${status}) : ${detail}`
            : `Erreur serveur lors de l’archivage (${status}). Réessaie plus tard ou vérifie les logs n8n pour ce workflow.`;
    }
    return friendlyHelperChatSendError(err);
}

const DELETE_COPILOT_CONVERSATION_FALLBACK = "Erreur lors de la suppression de la conversation";

/** Toast erreur suppression / archivage liste Copilot (message backend si présent). */
export function friendlyDeleteCopilotConversationError(err: unknown): string {
    if (!isAxiosError(err)) return DELETE_COPILOT_CONVERSATION_FALLBACK;
    const detail = readAxiosResponseDetail(err);
    return detail || DELETE_COPILOT_CONVERSATION_FALLBACK;
}

export function friendlyHelperChatSendError(err: unknown): string {
    const errBody = isAxiosError(err)
        ? (err.response?.data as { code?: unknown; errors?: unknown; message?: unknown } | undefined)
        : undefined;
    let friendly = "Le Copilot est temporairement indisponible. Réessaie dans quelques secondes.";
    if (String(errBody?.code ?? "") === "validation_failed" && Array.isArray(errBody?.errors)) {
        friendly = `Validation : ${errBody.errors.map((e) => String(e)).join(", ")}`;
    } else if (errBody?.message != null) {
        friendly = String(errBody.message);
    } else if (err instanceof Error) {
        friendly = err.message;
    }
    return friendly;
}

export function formatConversationTimeAgo(iso: string | null): string {
    if (!iso) return "";
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}j`;
}
