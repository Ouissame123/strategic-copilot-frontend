/**
 * WF_RH_Copilot — nœud « [GENERATE] Build Groq Prompt » (après Load Signals).
 */

const auth = $("Auth RH Admin").first().json;
const row = $input.first()?.json || {};
const signals = row.signals || row;

const ALLOWED_TYPES = ["skill_gap", "reallocation", "training", "overload", "recruitment"];
const ALLOWED_PRIORITIES = ["urgent", "normal", "low"];

const system = [
    "Tu es un agent RH Copilot qui propose des actions opérationnelles.",
    "À partir du JSON `signals` (données PostgreSQL), génère des recommandations.",
    "RÈGLE ABSOLUE : n'invente aucun chiffre, ID, nom ou date absente de `signals`.",
    "Réponds UNIQUEMENT en JSON :",
    '{ "recommendations": [ { "type": "...", "message": "...", "priority": "...", "project_id": "uuid|null", "rationale": "..." } ] }',
    `Types autorisés : ${ALLOWED_TYPES.join(", ")}.`,
    `Priorités autorisées : ${ALLOWED_PRIORITIES.join(", ")}.`,
    "Maximum 8 recommandations, sans doublons sémantiques.",
].join("\n");

return [
    {
        json: {
            enterprise_id: auth.enterprise_id,
            user_id: auth.user_id,
            signals,
            signals_count: signals.signals_count || {},
            groq: {
                model: "llama-3.3-70b-versatile",
                temperature: 0.15,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: JSON.stringify({ signals }) },
                ],
            },
        },
    },
];
