/** Réponses WF Manager Analyst — POST /webhook/api/analyst/* */

export type ManagerAnalystRequestBody = {
    enterprise_id: string;
    manager_id: string;
};

export type ManagerAnalystIpiDistribution = {
    top: number;
    strong: number;
    average: number;
    at_risk: number;
};

export type ManagerAnalystIpiTopRow = {
    talent_id?: string | null;
    talent_name: string;
    ipi_score: number;
    ipi_band?: string;
    band?: string;
    workload_ratio?: number;
};

export type ManagerAnalystIpiResponse = {
    status?: string;
    avg_ipi: number;
    total_talents: number;
    distribution: ManagerAnalystIpiDistribution;
    top_5: ManagerAnalystIpiTopRow[];
};

export type ManagerAnalystNineBoxGrid = {
    distribution: Record<string, number>;
    boxes: unknown;
    talents?: unknown;
};

export type ManagerAnalystNineBoxResponse = {
    status?: string;
    total_talents?: number;
    grid: ManagerAnalystNineBoxGrid;
};

export type ManagerAnalystMobilityTalent = {
    talent_id?: string | null;
    talent_name: string;
    mobility_score: number;
    mobility_bucket: string;
    mobility_flag?: string;
};

export type ManagerAnalystMobilityDistribution = {
    ready_to_move: number;
    anchored?: number;
    mobile?: number;
    [key: string]: number | undefined;
};

export type ManagerAnalystMobilityResponse = {
    status?: string;
    total_talents?: number;
    distribution: ManagerAnalystMobilityDistribution;
    talents: ManagerAnalystMobilityTalent[];
};
