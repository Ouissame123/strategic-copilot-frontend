/**
 * WF_RH_Chat — nœud « [CHAT] Build Response » (après insert messages).
 */

const chat = $("Parse LLM or Fallback").first().json;
const assistant = chat.assistant || {};
const userRow = $input.all().map((i) => i.json).find((r) => r.role === "user");
const assistantRow = $input.all().map((i) => i.json).find((r) => r.role === "assistant");

const computedAt = new Date().toISOString();

return [
    {
        json: {
            status: "success",
            workflow: "WF_RH_Chat",
            conversation_id: chat.conversation_id,
            reply: assistant.reply || "",
            details: assistant.details || [],
            intent: assistant.intent || "rh_answer",
            suggested_actions: assistant.suggested_actions || [],
            sources: assistant.sources || [],
            confidence: assistant.confidence ?? 0.8,
            quick_replies: assistant.quick_replies || [],
            llm_enriched: assistant.llm_enriched !== false,
            meta: {
                api_version: "v1",
                source_agent: "rh_chat",
                computed_at: computedAt,
            },
            user_message_id: userRow?.id,
            assistant_message_id: assistantRow?.id,
        },
    },
];
