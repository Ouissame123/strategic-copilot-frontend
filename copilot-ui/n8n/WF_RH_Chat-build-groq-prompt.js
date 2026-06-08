/**
 * WF_RH_Chat — nœud « [CHAT] Build Groq Prompt » (après Load Context).
 * Ne jamais inventer de chiffres : le modèle ne doit citer que le JSON `context` fourni.
 */

const chat = $("Resolve Conversation").first().json;
const ctxRow = $input.first()?.json || {};
const context = ctxRow.context || ctxRow;

const system = [
    "Tu es RH Strategic Copilot pour une entreprise.",
    "Réponds en français, de façon concise et actionnable.",
    "RÈGLE ABSOLUE : n'invente aucun chiffre, nom de talent, projet ou date.",
    "Tous les nombres doivent provenir exclusivement du bloc JSON `context` ci-dessous.",
    "Si une information manque dans `context`, dis-le explicitement.",
    'Réponds UNIQUEMENT en JSON valide avec les clés :',
    "reply (string), intent (string), details (array of strings),",
    "suggested_actions (array of {label,type,payload}), sources (array of {type,id,label}),",
    "confidence (number 0-1), quick_replies (array of strings).",
].join("\n");

const userPayload = {
    question: chat.message,
    talent_id: chat.talent_id || null,
    project_id: chat.project_id || null,
    context,
};

return [
    {
        json: {
            ...chat,
            context,
            groq: {
                model: "llama-3.3-70b-versatile",
                temperature: 0.2,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: JSON.stringify(userPayload) },
                ],
            },
        },
    },
];
