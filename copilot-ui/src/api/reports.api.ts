import { buildN8nUrl } from "@/lib/build-n8n-url";
import { authStorage } from "@/lib/auth-storage";
import { httpClient } from "@/lib/http-client";
import { getApiAuthToken } from "@/utils/apiClient";

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

const REPORTS_HISTORY_PATH = "/webhook/reports/history";

export const REPORTS_HISTORY_EMPTY_ERROR =
    "Réponse vide depuis /reports/history — vérifier proxy Vite ou URL n8n.";

function historyQueryString(enterpriseId: string, limit: number): string {
    return new URLSearchParams({
        enterprise_id: enterpriseId.trim(),
        limit: String(limit),
    }).toString();
}

function relativeWebhookUrl(pathWithQuery: string): string | null {
    if (typeof window === "undefined" || !window.location?.origin) return null;
    return new URL(pathWithQuery, window.location.origin).href;
}

/** Chemins candidats pour GET historique (ordre : proxy Vite relatif, puis n8n absolu si configuré). */
export function buildReportsHistoryRequestUrls(enterpriseId: string, limit = 50): string[] {
    const qs = historyQueryString(enterpriseId, limit);
    const pathWithQuery = `${REPORTS_HISTORY_PATH}?${qs}`;
    const urls = new Set<string>();

    const viaProxy = relativeWebhookUrl(pathWithQuery);
    if (viaProxy) urls.add(viaProxy);

    const viaEnv = buildN8nUrl(pathWithQuery);
    if (viaEnv.startsWith("http://") || viaEnv.startsWith("https://")) {
        urls.add(viaEnv);
    }

    return [...urls];
}

/** URL complète pour debug Network / console. */
export function buildReportsHistoryRequestUrl(enterpriseId: string, limit = 50): string {
    return buildReportsHistoryRequestUrls(enterpriseId, limit)[0] ?? buildN8nUrl(`${REPORTS_HISTORY_PATH}?${historyQueryString(enterpriseId, limit)}`);
}

function reportsAuthHeaders(json = false): HeadersInit {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (json) headers["Content-Type"] = "application/json";
    const token = authStorage.getAccessToken()?.trim() || getApiAuthToken()?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

/** URL absolue pour POST/GET rapports (proxy Vite puis n8n si base configurée). */
function resolveReportsApiUrl(path: string): string[] {
    const urls = new Set<string>();
    const viaProxy = relativeWebhookUrl(path);
    if (viaProxy) urls.add(viaProxy);

    const viaEnv = buildN8nUrl(path);
    if (viaEnv.startsWith("http://") || viaEnv.startsWith("https://")) {
        urls.add(viaEnv);
    }

    return [...urls];
}

async function parseReportsJsonResponse(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text.trim()) return null;
    try {
        return JSON.parse(text) as unknown;
    } catch {
        throw new Error(`Réponse JSON invalide: ${text.slice(0, 300)}`);
    }
}

function historyAuthHeaders(): HeadersInit {
    return reportsAuthHeaders(false);
}

async function fetchReportsHistoryFromUrl(url: string): Promise<unknown> {
    const res = await fetch(url, {
        method: "GET",
        headers: historyAuthHeaders(),
        credentials: "same-origin",
    });

    console.log("REPORTS HISTORY STATUS:", res.status);
    console.log("REPORTS HISTORY CONTENT-TYPE:", res.headers.get("content-type"));

    const text = await res.text();
    console.log("REPORTS HISTORY TEXT:", text);

    if (!res.ok) {
        throw new Error(`Reports history failed: ${res.status} ${text.slice(0, 500)}`);
    }

    if (!text.trim()) {
        return null;
    }

    try {
        return JSON.parse(text) as unknown;
    } catch {
        throw new Error(`Reports history invalid JSON: ${text.slice(0, 300)}`);
    }
}

/**
 * GET historique rapports — `fetch` + corps texte (évite `res.data` undefined avec axios).
 * Essaie d’abord le proxy Vite (`/webhook/reports/history`), puis l’URL n8n absolue.
 */
export async function fetchReportsHistory(enterpriseId: string, options?: { limit?: number }): Promise<unknown> {
    const limit = options?.limit ?? 50;
    const enterprise_id = enterpriseId.trim();
    if (!enterprise_id) {
        throw new Error("enterprise_id requis pour GET /webhook/reports/history");
    }

    const urls = buildReportsHistoryRequestUrls(enterprise_id, limit);
    console.log("REPORTS HISTORY URL CANDIDATES:", urls);

    let lastError: Error | null = null;

    for (const url of urls) {
        console.log("REPORTS HISTORY URL:", url);
        try {
            const data = await fetchReportsHistoryFromUrl(url);
            if (data == null) {
                lastError = new Error(REPORTS_HISTORY_EMPTY_ERROR);
                console.warn("REPORTS HISTORY empty body, trying next URL…");
                continue;
            }
            return data;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.warn("REPORTS HISTORY attempt failed:", url, lastError.message);
        }
    }

    throw lastError ?? new Error(REPORTS_HISTORY_EMPTY_ERROR);
}

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

/** @deprecated Préférer `fetchReportsHistory`. */
export async function getReportsHistory(enterpriseId: string, options?: { limit?: number }) {
    const data = await fetchReportsHistory(enterpriseId, options);
    return { data };
}

export type DeleteReportResponse = {
    success: boolean;
    report_id?: string;
    deleted_at?: string;
    message?: string;
};

/** POST /webhook/reports/delete */
export async function deleteReport(enterpriseId: string, reportId: string): Promise<DeleteReportResponse> {
    const enterprise_id = enterpriseId.trim();
    const report_id = reportId.trim();
    if (!enterprise_id || !report_id) {
        throw new Error("enterprise_id et report_id requis pour POST /webhook/reports/delete");
    }

    const body = JSON.stringify({ enterprise_id, report_id });
    const urls = resolveReportsApiUrl("/webhook/reports/delete");
    let lastError: Error | null = null;

    for (const url of urls) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: reportsAuthHeaders(true),
                body,
                credentials: "same-origin",
            });

            const data = (await parseReportsJsonResponse(res)) as DeleteReportResponse | null;

            if (data?.success) {
                return data;
            }

            if (res.ok && data && data.success === false) {
                return {
                    success: false,
                    message: data.message ?? "Erreur lors de la suppression",
                };
            }

            if (!res.ok) {
                lastError = new Error(data?.message ?? `Reports delete failed: ${res.status}`);
                continue;
            }

            lastError = new Error("Réponse vide depuis /webhook/reports/delete");
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.error("Delete report error:", err);
        }
    }

    throw lastError ?? new Error("Erreur réseau lors de la suppression");
}

/** POST /webhook/reports/send-email */
export function sendReportEmail(payload: SendReportEmailPayload) {
    return httpClient.post<unknown>("/webhook/reports/send-email", payload, silent);
}

/** POST /webhook/reports/schedule */
export function scheduleReport(payload: ScheduleReportPayload) {
    return httpClient.post<unknown>("/webhook/reports/schedule", payload, silent);
}
