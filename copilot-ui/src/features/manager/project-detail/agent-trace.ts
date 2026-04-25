import type { AgentTrace, ProjectDetailModel } from "@/features/manager/project-detail/types";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function maxIso(values: Array<string | null | undefined>): string | null {
    let best: number | null = null;
    for (const value of values) {
        if (!value) continue;
        const ts = new Date(value).getTime();
        if (!Number.isFinite(ts)) continue;
        if (best == null || ts > best) best = ts;
    }
    return best == null ? null : new Date(best).toISOString();
}

function freshnessOf(lastRunAt: string | null): "fresh" | "aging" | "stale" {
    if (!lastRunAt) return "stale";
    const ts = new Date(lastRunAt).getTime();
    if (!Number.isFinite(ts)) return "stale";
    const ageDays = (Date.now() - ts) / ONE_DAY_MS;
    if (ageDays < 7) return "fresh";
    if (ageDays < 14) return "aging";
    return "stale";
}

export function buildAgentTraces(project: ProjectDetailModel): AgentTrace[] {
    const watchdogFromRisks = maxIso(project.risks.map((risk) => risk.detected_at));
    const talentLastRun = maxIso(project.talents.map((talent) => talent.matched_at));

    const traces: AgentTrace[] = [
        {
            key: "analyst",
            label: "Analyst Senior",
            workflow: "WF_Project_Analysis",
            last_run_at: project.analysis?.analyzed_at ?? null,
            freshness: freshnessOf(project.analysis?.analyzed_at ?? null),
            contributes_to: ["KPIs", "Atmosphère", "Alerts"],
            can_rerun: true,
        },
        {
            key: "watchdog",
            label: "Watchdog Senior",
            workflow: "WF_Project_Risk",
            last_run_at: project.risk_score?.calculated_at ?? watchdogFromRisks,
            freshness: freshnessOf(project.risk_score?.calculated_at ?? watchdogFromRisks),
            contributes_to: ["Score de risque", "Drivers", "Risques actifs"],
            run_id: project.risk_score?.analysis_run_id ?? null,
            can_rerun: true,
        },
        {
            key: "strategist",
            label: "Strategist v2",
            workflow: "WF_Project_Viability",
            last_run_at: project.viability?.generated_at ?? null,
            freshness: freshnessOf(project.viability?.generated_at ?? null),
            contributes_to: ["Viabilité", "Décision", "Explication"],
            can_rerun: true,
        },
        {
            key: "talent",
            label: "Talent Insights Senior",
            workflow: "WF_Talent_Insights",
            last_run_at: talentLastRun,
            freshness: freshnessOf(talentLastRun),
            contributes_to: ["Équipe", "Recommandations"],
            can_rerun: true,
        },
        {
            key: "helper",
            label: "Helper Copilot",
            workflow: "WF_Copilot_Project_Detail",
            last_run_at: null,
            freshness: "stale",
            contributes_to: ["Copilot"],
            can_rerun: false,
        },
    ];

    return traces;
}
