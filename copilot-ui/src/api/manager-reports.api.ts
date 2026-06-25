import {
    deleteReport,
    fetchReportsHistory,
    generateBoardPack,
    generateProjectDossier,
    getReportsSummary,
    scheduleReport,
    sendReportEmail,
    type DeleteReportResponse,
    type GenerateReportResponse,
    type ScheduleReportPayload,
    type SendReportEmailPayload,
} from "@/api/reports.api";

/** TODO backend : retirer enterprise_id du body/query quand JWT auto-decode sera en place. */
export type BoardPackGenerateParams = {
    period: "last_7_days" | "last_30_days" | "last_90_days" | "ytd";
    language: "fr" | "en";
    includeCharts: boolean;
    includeAIRecommendations: boolean;
};

export type ProjectDossierGenerateParams = {
    project_id: string;
    language: "fr" | "en";
    includeRisks: boolean;
    includeDecisions: boolean;
    includeTeam: boolean;
};

export type ScheduleReportParams = Omit<ScheduleReportPayload, "enterprise_id">;
export type SendReportEmailParams = Omit<SendReportEmailPayload, "enterprise_id">;

export const managerReportsApi = {
    getSummary: (enterpriseId: string) => getReportsSummary(enterpriseId.trim()).then((r) => r.data),
    getHistory: (enterpriseId: string, limit = 50) => fetchReportsHistory(enterpriseId.trim(), { limit }),
    generateBoardPack: (enterpriseId: string, body: BoardPackGenerateParams): Promise<GenerateReportResponse> =>
        generateBoardPack({ ...body, enterprise_id: enterpriseId.trim() }).then((r) => r.data as GenerateReportResponse),
    generateProjectDossier: (enterpriseId: string, body: ProjectDossierGenerateParams): Promise<GenerateReportResponse> =>
        generateProjectDossier({ ...body, enterprise_id: enterpriseId.trim() }).then((r) => r.data as GenerateReportResponse),
    sendEmail: (enterpriseId: string, body: SendReportEmailParams) =>
        sendReportEmail({ ...body, enterprise_id: enterpriseId.trim() }).then((r) => r.data),
    schedule: (enterpriseId: string, body: ScheduleReportParams) =>
        scheduleReport({ ...body, enterprise_id: enterpriseId.trim() }).then((r) => r.data),
    delete: (enterpriseId: string, reportId: string): Promise<DeleteReportResponse> =>
        deleteReport(enterpriseId.trim(), reportId.trim()),
};
