import type { ProjectDetail } from "@/api/workspace-manager.api";

export type AgentKey = "analyst" | "watchdog" | "strategist" | "talent" | "helper";

export interface AgentTrace {
    key: AgentKey;
    label: string;
    workflow: string;
    last_run_at: string | null;
    freshness: "fresh" | "aging" | "stale";
    contributes_to: string[];
    run_id?: string | null;
    can_rerun: boolean;
}

export interface RecomputeRequest {
    project_id: string;
    agent: AgentKey;
}

export interface RecomputeResponse {
    ok: boolean;
    run_id: string;
    started_at: string;
}

export type ProjectDetailModel = ProjectDetail;
