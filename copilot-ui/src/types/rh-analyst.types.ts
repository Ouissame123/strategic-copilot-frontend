/** WF Analyst RH — POST /api/analyst/ipi & /api/analyst/nine-box */

export type RhAnalystIpiDistribution = {
    top: number;
    strong: number;
    average: number;
    at_risk: number;
};

export type RhAnalystTopTalentRow = {
    talent_id?: string | null;
    talent_name: string;
    ipi_score: number;
    ipi_band: string;
    workload_ratio: number;
};

export type RhAnalystIpiResponse = {
    status?: string;
    avg_ipi: number;
    total_talents: number;
    distribution: RhAnalystIpiDistribution;
    top_talents: RhAnalystTopTalentRow[];
};

export type RhAnalystNineBoxDistributionItem = {
    box_label: string;
    count: number;
    display_label: string;
};

export type RhAnalystNineBoxTalent = {
    talent_id?: string | null;
    talent_name: string;
    box_index: number;
    box_label?: string | null;
};

export type RhAnalystNineBoxCell = {
    box_index: number;
    box_label: string | null;
    performance: string | null;
    potential: string | null;
    talents: RhAnalystNineBoxTalent[];
};

export type RhAnalystNineBoxResponse = {
    status?: string;
    total_talents: number;
    /** `response.grid.distribution` */
    distribution: RhAnalystNineBoxDistributionItem[];
    /** Matrice 3×3 — index 1–3 haut, 4–6 milieu, 7–9 bas */
    matrix: RhAnalystNineBoxCell[][];
};

export type RhAnalystFetchBody = {
    enterprise_id: string;
};

export type RhAnalystInsightsResult = {
    ipi: RhAnalystIpiResponse | null;
    nineBox: RhAnalystNineBoxResponse | null;
    ipiError: string | null;
    nineBoxError: string | null;
};
