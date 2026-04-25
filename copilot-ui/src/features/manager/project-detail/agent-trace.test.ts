import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAgentTraces } from "@/features/manager/project-detail/agent-trace";
import type { ProjectDetail } from "@/api/workspace-manager.api";

function daysAgo(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function makeProject(overrides: Partial<ProjectDetail>): ProjectDetail {
    return {
        id: "p1",
        name: "Projet",
        status: "active",
        priority: 1,
        description: null,
        start_date: null,
        milestone_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        enterprise_id: "e1",
        budget_rh_planned: null,
        budget_rh_actual: null,
        viability: null,
        analysis: null,
        risk_score: null,
        risks: [],
        talents: [],
        recommendations: [],
        ...overrides,
    };
}

describe("buildAgentTraces", () => {
    it("classe les freshness buckets correctement", () => {
        const project = makeProject({
            analysis: {
                id: "a1",
                delay_days: null,
                progress_pct: null,
                capacity_load_pct: null,
                project_health_score: null,
                strategic_alignment_score: null,
                time_to_impact_days: null,
                alerts: [],
                kpi_json: {},
                computed_at: null,
                analyzed_at: daysAgo(3),
            },
            risk_score: {
                id: "r1",
                fragility_score: null,
                anxiety_pulse: null,
                chronic_overload_score: null,
                critical_skills_gap_score: null,
                key_talent_dependency_score: null,
                computed_at: null,
                calculated_at: daysAgo(10),
            },
            viability: {
                id: "v1",
                decision: "Adjust",
                viability_score: 6,
                score_skills_fit: 5,
                score_capacity: 6,
                score_budget: 6,
                score_risk: 5,
                explanation: null,
                computed_at: null,
                analysis_version: 1,
                generated_at: daysAgo(23),
            },
        });

        const traces = buildAgentTraces(project);
        assert.equal(traces.find((t) => t.key === "analyst")?.freshness, "fresh");
        assert.equal(traces.find((t) => t.key === "watchdog")?.freshness, "aging");
        assert.equal(traces.find((t) => t.key === "strategist")?.freshness, "stale");
    });

    it("retourne stale pour les dates null et tableaux vides", () => {
        const traces = buildAgentTraces(makeProject({}));
        assert.equal(traces.find((t) => t.key === "talent")?.last_run_at, null);
        assert.equal(traces.find((t) => t.key === "talent")?.freshness, "stale");
        assert.equal(traces.find((t) => t.key === "watchdog")?.last_run_at, null);
    });
});
