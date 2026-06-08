/**
 * WF_RH_Copilot — normaliser sortie Groq (ou fallback) avant boucle INSERT.
 */

const base = $("Build Groq Prompt").first().json;
const groqItem = $input.first()?.json || {};

const ALLOWED_TYPES = new Set(["skill_gap", "reallocation", "training", "overload", "recruitment"]);
const ALLOWED_PRIORITIES = new Set(["urgent", "normal", "low"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let recommendations = [];
let llm_enriched = false;

let rawText = "";
if (typeof groqItem.choices?.[0]?.message?.content === "string") {
    rawText = groqItem.choices[0].message.content;
} else if (typeof groqItem.recommendations !== "undefined") {
    recommendations = Array.isArray(groqItem.recommendations) ? groqItem.recommendations : [];
    llm_enriched = true;
}

if (rawText.trim() && !recommendations.length) {
    try {
        const j = JSON.parse(rawText);
        recommendations = Array.isArray(j.recommendations) ? j.recommendations : [];
        llm_enriched = true;
    } catch {
        recommendations = [];
    }
}

if (!recommendations.length) {
    const fb = $("Fallback Recommendations").first().json;
    recommendations = fb.recommendations || [];
    llm_enriched = false;
}

const clean = (v) => (v == null ? "" : String(v).trim());
const seen = new Set();
const normalized = [];

for (const r of recommendations) {
    if (!r || typeof r !== "object") continue;
    let type = clean(r.type).toLowerCase().replace(/\s+/g, "_");
    if (!ALLOWED_TYPES.has(type)) continue;

    const message = clean(r.message);
    if (!message || message.length > 4000) continue;

    let priority = clean(r.priority).toLowerCase();
    if (!ALLOWED_PRIORITIES.has(priority)) priority = "normal";

    const projectRaw = clean(r.project_id);
    const project_id = projectRaw && UUID_RE.test(projectRaw) ? projectRaw : null;

    const dedupeKey = `${type}|${message}|${project_id || ""}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    normalized.push({
        type,
        message,
        priority,
        project_id,
        payload: {
            source: "rh_copilot",
            generated_at: new Date().toISOString(),
            rationale: clean(r.rationale) || null,
        },
    });
}

return [
    {
        json: {
            enterprise_id: base.enterprise_id,
            signals_count: base.signals_count || {},
            recommendations: normalized,
            proposed: normalized.length,
            llm_enriched,
        },
    },
];
