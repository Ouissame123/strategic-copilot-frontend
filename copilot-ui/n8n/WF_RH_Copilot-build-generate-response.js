/**
 * WF_RH_Copilot — agrège les INSERT (boucle n8n) en réponse finale.
 */

const norm = $("Normalize Recommendations").first().json;
const inserted = $input.all().map((i) => i.json).filter((r) => r && r.id);

const skipped = Math.max(0, (norm.proposed || 0) - inserted.length);
const computedAt = new Date().toISOString();

return [
    {
        json: {
            status: "success",
            workflow: "WF_RH_Copilot",
            operation: "generate_recommendations",
            llm_enriched: norm.llm_enriched !== false,
            signals_count: {
                overloaded: Number(norm.signals_count?.overloaded) || 0,
                skill_gaps: Number(norm.signals_count?.skill_gaps) || 0,
                contracts_ending: Number(norm.signals_count?.contracts_ending) || 0,
            },
            proposed: norm.proposed || 0,
            created_count: inserted.length,
            skipped_duplicates: skipped,
            created: inserted,
            meta: {
                api_version: "v1",
                source_agent: "rh_copilot",
                computed_at: computedAt,
            },
        },
    },
];
