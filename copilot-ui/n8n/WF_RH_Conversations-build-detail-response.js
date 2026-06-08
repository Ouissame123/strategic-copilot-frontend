/**
 * WF_RH_Conversations — nœud « [GET_DETAIL] Build Response ».
 * Entrée : item 0 = conversation (1 ligne), items suivants = messages.
 */

const items = $input.all().map((i) => i.json);
const conv = items.find((r) => r && r.id && (r.title !== undefined || r.status !== undefined)) || items[0] || {};

if (!conv || !conv.id) {
    return [{ json: { __valid: false, __code: "NOT_FOUND", __http: 404, message: "Conversation introuvable", workflow: "WF_RH_Conversations" } }];
}

const messages = items
    .filter((r) => r && r.role && r.content !== undefined)
    .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
        intent: m.intent ?? null,
        confidence: m.confidence != null ? Number(m.confidence) : null,
        suggested_actions: m.suggested_actions ?? [],
        quick_replies: m.quick_replies ?? [],
        sources: m.sources ?? [],
        details: m.details ?? [],
    }));

return [
    {
        json: {
            status: "success",
            workflow: "WF_RH_Conversations",
            operation: "get_detail",
            conversation: {
                id: conv.id,
                title: conv.title ?? null,
                manager_name: conv.manager_name ?? null,
                status: conv.status === "archived" ? "archived" : "active",
                last_message_at: conv.last_message_at ?? null,
                message_count: Number(conv.message_count) || messages.length,
            },
            messages,
        },
    },
];
