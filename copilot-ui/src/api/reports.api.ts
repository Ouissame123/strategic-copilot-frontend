import { httpClient } from "@/lib/http-client";

/** Réponse POST generate-board-pack / generate-project-dossier (n8n + PDFShift + Supabase). */
export type GenerateReportResponse = {
    success?: boolean;
    report_id?: string;
    type?: string;
    generated_at?: string;
    /** URL publique du PDF stocké (Supabase). */
    file_url?: string;
    message?: string;
    error?: string;
};

export type SendReportEmailPayload = {
    enterprise_id: string;
    report_id: string;
    recipients: string[];
    subject: string;
    message: string;
};

export type ScheduleReportPayload = {
    enterprise_id: string;
    /** Préféré par le workflow n8n (`type` reste accepté côté backend). */
    report_type: "board_pack" | "project_dossier";
    frequency: "weekly" | "monthly";
    recipients: string[];
    language: string;
    project_id?: string | null;
};

const silent = { skipGlobalHttpErrorToast: true as const };

/** GET /system/health — optionnel (n8n) ; 404 ignoré côté UI. */
export function getSystemHealth() {
    return httpClient.get<unknown>("/system/health", silent);
}

/** GET /webhook/reports/summary */
export function getReportsSummary(enterpriseId: string) {
    return httpClient.get<unknown>("/webhook/reports/summary", {
        params: { enterprise_id: enterpriseId },
        ...silent,
    });
}

/** POST /webhook/reports/generate-board-pack */
export function generateBoardPack(payload: Record<string, unknown>) {
    return httpClient.post<GenerateReportResponse>("/webhook/reports/generate-board-pack", payload, silent);
}

/** POST /webhook/reports/generate-project-dossier */
export function generateProjectDossier(payload: Record<string, unknown>) {
    return httpClient.post<GenerateReportResponse>("/webhook/reports/generate-project-dossier", payload, silent);
}

/** GET /webhook/reports/history */
export function getReportsHistory(enterpriseId: string, options?: { limit?: number }) {
    const limit = options?.limit ?? 50;
    return httpClient.get<unknown>("/webhook/reports/history", {
        params: { enterprise_id: enterpriseId, limit },
        ...silent,
    });
}

/** POST /webhook/reports/send-email */
export function sendReportEmail(payload: SendReportEmailPayload) {
    return httpClient.post<unknown>("/webhook/reports/send-email", payload, silent);
}

/** POST /webhook/reports/schedule */
export function scheduleReport(payload: ScheduleReportPayload) {
    return httpClient.post<unknown>("/webhook/reports/schedule", payload, silent);
}
