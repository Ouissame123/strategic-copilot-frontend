/**
 * WF_RH_Copilot — recommandations déterministes si Groq indisponible.
 */

const base = $("Build Groq Prompt").first().json;
const signals = base.signals || {};
const counts = signals.signals_count || {};

const recommendations = [];

const push = (type, message, priority, project_id = null) => {
    recommendations.push({ type, message, priority, project_id, rationale: "signal_postgres" });
};

const overloaded = Number(counts.overloaded) || 0;
const gaps = Number(counts.skill_gaps) || 0;
const contracts = Number(counts.contracts_ending) || 0;
const pending = Number(counts.pending_requests) || 0;
const understaffed = Number(counts.understaffed_projects) || 0;

if (overloaded > 0) {
    push(
        "overload",
        `Réallouer la charge : ${overloaded} talent(s) dépassent 100 % d'allocation.`,
        overloaded >= 3 ? "urgent" : "normal",
    );
}
if (gaps > 0) {
    push(
        "skill_gap",
        `Combler les écarts de compétences sur ${gaps} projet(s) identifié(s) par le matching.`,
        "normal",
    );
}
if (contracts > 0) {
    push(
        "training",
        `Anticiper ${contracts} fin(s) de contrat dans les 60 jours (plan de transition / remplacement).`,
        "urgent",
    );
}
if (pending > 0) {
    push(
        "reallocation",
        `${pending} demande(s) manager en attente — prioriser la décision RH.`,
        "urgent",
    );
}
if (understaffed > 0) {
    push(
        "recruitment",
        `${understaffed} projet(s) actif(s) avec équipe insuffisante (<2 talents affectés).`,
        "normal",
    );
}

return [
    {
        json: {
            ...base,
            recommendations,
            llm_enriched: false,
        },
    },
];
