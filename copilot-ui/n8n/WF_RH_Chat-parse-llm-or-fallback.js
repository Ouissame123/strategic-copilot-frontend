/**
 * WF_RH_Chat — nœud « [CHAT] Parse LLM or Fallback » (après HTTP Groq).
 * Si Groq échoue ou JSON invalide → fallback déterministe basé sur `context` PostgreSQL.
 */

const chat = $("Build Groq Prompt").first().json;
const context = chat.context || {};
const counts = context.counts || {};

const groqItem = $input.first()?.json || {};
let rawText = "";

if (typeof groqItem.choices?.[0]?.message?.content === "string") {
    rawText = groqItem.choices[0].message.content;
} else if (typeof groqItem.message?.content === "string") {
    rawText = groqItem.message.content;
} else if (typeof groqItem.body === "string") {
    rawText = groqItem.body;
} else if (typeof groqItem.content === "string") {
    rawText = groqItem.content;
}

const cleanArr = (v) => (Array.isArray(v) ? v : []);
const clampConf = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0.75;
    return Math.min(1, Math.max(0, n));
};

function deterministicFallback() {
    const overloaded = Number(counts.talents_overloaded) || 0;
    const contracts = Number(counts.contracts_ending_soon) || 0;
    const pending = Number(counts.pending_manager_requests) || 0;
    const gaps = Number(counts.projects_with_skill_gaps) || 0;
    const lowTeam = Number(counts.active_projects_low_team) || 0;

    const details = [];
    if (overloaded > 0) details.push(`${overloaded} talent(s) en surcharge d'allocation (>100 %).`);
    if (contracts > 0) details.push(`${contracts} contrat(s) se terminant dans les 60 prochains jours.`);
    if (pending > 0) details.push(`${pending} demande(s) manager en attente de décision RH.`);
    if (gaps > 0) details.push(`${gaps} projet(s) avec écarts de compétences détectés.`);
    if (lowTeam > 0) details.push(`${lowTeam} projet(s) actif(s) avec équipe insuffisante (<2 talents).`);
    if (!details.length) details.push("Aucun signal critique détecté dans les données actuelles.");

    const suggested_actions = [];
    if (pending > 0) {
        suggested_actions.push({ label: "Traiter les demandes managers", type: "open_rh_requests", payload: {} });
    }
    if (overloaded > 0) {
        suggested_actions.push({ label: "Analyser les surcharges", type: "open_mobility", payload: {} });
    }

    return {
        reply:
            "Je n'ai pas pu contacter le modèle Groq. Voici une synthèse basée uniquement sur les données PostgreSQL : " +
            details.join(" "),
        intent: "rh_fallback",
        details,
        suggested_actions,
        sources: [],
        confidence: 0.65,
        quick_replies: ["Générer des recommandations", "Lister les demandes en attente"],
        llm_enriched: false,
    };
}

let parsed = null;
if (rawText.trim()) {
    try {
        const j = JSON.parse(rawText);
        if (j && typeof j === "object") parsed = j;
    } catch {
        parsed = null;
    }
}

const out = parsed?.reply
    ? {
          reply: String(parsed.reply).trim(),
          intent: String(parsed.intent || "rh_answer").trim(),
          details: cleanArr(parsed.details).map(String),
          suggested_actions: cleanArr(parsed.suggested_actions),
          sources: cleanArr(parsed.sources),
          confidence: clampConf(parsed.confidence),
          quick_replies: cleanArr(parsed.quick_replies).map(String),
          llm_enriched: true,
      }
    : deterministicFallback();

return [
    {
        json: {
            ...chat,
            assistant: out,
            user_metadata: {
                intent: null,
                talent_id: chat.talent_id,
                project_id: chat.project_id,
            },
            assistant_metadata: {
                intent: out.intent,
                confidence: out.confidence,
                suggested_actions: out.suggested_actions,
                sources: out.sources,
                details: out.details,
                quick_replies: out.quick_replies,
                llm_enriched: out.llm_enriched,
            },
        },
    },
];
