/**
 * WF_RH_Chat — prépare 2 items (user puis assistant) pour boucle INSERT messages.
 */

const chat = $("Parse LLM or Fallback").first().json;
const assistant = chat.assistant || {};

return [
    {
        json: {
            conversation_id: chat.conversation_id,
            enterprise_id: chat.enterprise_id,
            role: "user",
            content: chat.message,
            metadata: chat.user_metadata || {},
        },
    },
    {
        json: {
            conversation_id: chat.conversation_id,
            enterprise_id: chat.enterprise_id,
            role: "assistant",
            content: assistant.reply || "",
            metadata: {
                ...(chat.assistant_metadata || {}),
                intent: assistant.intent,
                confidence: assistant.confidence,
                suggested_actions: assistant.suggested_actions || [],
                sources: assistant.sources || [],
                details: assistant.details || [],
                quick_replies: assistant.quick_replies || [],
            },
        },
    },
];
