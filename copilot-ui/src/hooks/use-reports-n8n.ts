import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    generateBoardPack,
    generateProjectDossier,
    buildReportsHistoryRequestUrl,
    deleteReport,
    fetchReportsHistory,
    getReportsSummary,
    scheduleReport,
    sendReportEmail,
    type GenerateReportResponse,
    type ScheduleReportPayload,
    type SendReportEmailPayload,
} from "@/api/reports.api";
import { coerceReportType } from "@/components/reports/adapters";
import type { ReportFormat, ReportHistoryItem, ReportStatus } from "@/components/reports/types";
import { labelReportType } from "@/components/reports/utils";

/** Ligne brute API / table `reports_history` (usage interne régénération, e-mail). */
export type N8nReportHistoryItem = {
    report_id: string;
    name: string;
    type: string;
    generated_at: string;
    status: string;
    size_bytes?: number;
    file_url?: string;
    download_url?: string;
    project_id?: string;
    metadata?: Record<string, unknown>;
};

export type ReportsHistoryQueryResult = {
    /** Rapports affichés dans l’onglet Historique (PDF avec URL, statut non bloquant). */
    display: ReportHistoryItem[];
    /** Tous les rapports normalisés (filtre « Échecs »). */
    all: ReportHistoryItem[];
};

function asRecord(v: unknown): Record<string, unknown> | null {
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function coerceReportFormat(raw: unknown): ReportFormat {
    const s = String(raw ?? "pdf")
        .trim()
        .toLowerCase();
    if (s === "csv") return "csv";
    if (s === "excel" || s === "xlsx") return "excel";
    if (s === "print") return "print";
    return "pdf";
}

/** Corps JSON : racine, `data` / `body` / `payload`, ou tableau n8n. */
function unwrapHistoryEnvelope(payload: unknown): Record<string, unknown> | null {
    let node: unknown = payload;
    if (typeof node === "string") {
        try {
            node = JSON.parse(node) as unknown;
        } catch {
            return null;
        }
    }

    if (Array.isArray(node)) {
        if (node.length === 0) return null;
        const first = node[0];
        const firstRec = asRecord(first);
        if (firstRec && Array.isArray(firstRec.reports)) return unwrapHistoryEnvelope(first);
        const looksLikeReportRow = node.some((row) => {
            const r = asRecord(row);
            return r && (r.reportId != null || r.report_id != null);
        });
        if (looksLikeReportRow) return { success: true, reports: node, count: node.length };
        return unwrapHistoryEnvelope(first);
    }

    const rec = asRecord(node);
    if (!rec) return null;
    if (Array.isArray(rec.reports)) return rec;

    for (const key of ["data", "body", "payload", "result"] as const) {
        const nested = asRecord(rec[key]);
        if (nested && Array.isArray(nested.reports)) return nested;
    }

    return rec;
}

function flattenRow(raw: unknown): Record<string, unknown> | null {
    const r = asRecord(raw);
    if (!r) return null;
    const fromJson = asRecord(r.json);
    const fromBody = asRecord(r.body);
    if (fromJson) return { ...r, ...fromJson };
    if (fromBody) return { ...r, ...fromBody };
    return r;
}

function extractFileUrl(r: Record<string, unknown>): string {
    const direct = String(
        r.file_url ?? r.fileUrl ?? r.download_url ?? r.downloadUrl ?? r.url ?? r.public_url ?? "",
    ).trim();
    if (direct) return direct;
    const meta = asRecord(r.metadata);
    if (!meta) return "";
    return String(
        meta.file_url ?? meta.fileUrl ?? meta.url ?? meta.public_url ?? meta.download_url ?? meta.downloadUrl ?? "",
    ).trim();
}

function isEligibleForDisplay(fileUrl: string, statusRaw: string): boolean {
    if (!fileUrl) return false;
    const st = statusRaw.trim().toLowerCase();
    if (["failed", "error", "cancelled"].includes(st)) return false;
    if (["generating", "pending", "processing"].includes(st)) return false;
    return true;
}

function coerceUiStatus(statusRaw: string, hasFile: boolean): ReportStatus {
    const st = statusRaw.trim().toLowerCase();
    if (st === "failed" || st === "error") return "failed";
    if (st === "generating" || st === "pending" || st === "processing") return "generating";
    if (st === "archived") return "archived";
    if (st === "generated" || st === "ready" || st === "completed" || st === "success" || st === "done") return "ready";
    return hasFile ? "ready" : "generating";
}

function mapRowToHistoryItem(r: Record<string, unknown>, options?: { requirePdf?: boolean }): ReportHistoryItem | null {
    const fileUrl = extractFileUrl(r);
    const statusRaw = String(r.apiStatus ?? r.status ?? "").trim().toLowerCase();
    const requirePdf = options?.requirePdf !== false;

    if (requirePdf && !isEligibleForDisplay(fileUrl, statusRaw)) return null;

    const generatedAt = String(r.generatedAt ?? r.generated_at ?? r.created_at ?? r.createdAt ?? "").trim();
    const reportId =
        String(r.reportId ?? r.report_id ?? r.id ?? r.report_history_id ?? "").trim() ||
        (fileUrl && generatedAt ? `hist:${fileUrl}:${generatedAt}` : fileUrl ? `hist:${fileUrl}` : "");

    if (!reportId) return null;

    const type = coerceReportType(String(r.type ?? r.report_type ?? "board_pack"));
    const status = coerceUiStatus(statusRaw, Boolean(fileUrl));
    const projectId = r.projectId != null ? String(r.projectId) : r.project_id != null ? String(r.project_id) : null;
    const projectName =
        r.projectName != null
            ? String(r.projectName)
            : r.project_name != null
              ? String(r.project_name)
              : null;

    const title =
        String(r.title ?? r.name ?? r.filename ?? "").trim() ||
        (projectName ? `${labelReportType(type)} — ${projectName}` : labelReportType(type));

    const sizeRaw = r.fileSize ?? r.size_bytes ?? r.file_size ?? r.sizeBytes;
    const fileSize = sizeRaw != null && Number.isFinite(Number(sizeRaw)) ? Number(sizeRaw) : null;
    const meta = asRecord(r.metadata);

    return {
        reportId,
        title,
        type,
        format: coerceReportFormat(r.format),
        status,
        apiStatus: statusRaw || undefined,
        fileUrl: fileUrl || null,
        fileSize,
        generatedAt: generatedAt || new Date().toISOString(),
        generatedBy: r.generatedBy != null ? String(r.generatedBy) : r.generated_by != null ? String(r.generated_by) : null,
        projectId,
        projectName,
        period: r.period != null ? String(r.period) : null,
        language: r.language != null ? String(r.language) : "fr",
        metadata: meta,
    };
}

export function historyItemToN8n(item: ReportHistoryItem): N8nReportHistoryItem {
    return {
        report_id: item.reportId,
        name: item.title,
        type: item.type,
        generated_at: item.generatedAt,
        status: item.apiStatus ?? "generated",
        file_url: item.fileUrl ?? undefined,
        download_url: item.fileUrl ?? undefined,
        project_id: item.projectId ?? undefined,
        size_bytes: item.fileSize ?? undefined,
        metadata: item.metadata ?? undefined,
    };
}

/** Parse GET /webhook/reports/history — `reports[]` snake_case ou camelCase. */
export function parseReportsHistoryResponse(payload: unknown): ReportsHistoryQueryResult {
    const data = unwrapHistoryEnvelope(payload);
    const rawReports = data && Array.isArray(data.reports) ? (data.reports as unknown[]) : [];

    const normalized = rawReports
        .map((row) => flattenRow(row))
        .filter((r): r is Record<string, unknown> => r != null)
        .map((r) => mapRowToHistoryItem(r, { requirePdf: false }))
        .filter((x): x is ReportHistoryItem => x != null);

    const display = normalized
        .filter((item) => isEligibleForDisplay(String(item.fileUrl ?? "").trim(), String(item.apiStatus ?? item.status ?? "")))
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

    const all = [...normalized].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

    return { display, all };
}

export function sortReportsByGeneratedAtDesc(items: N8nReportHistoryItem[]): N8nReportHistoryItem[] {
    return [...items].sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
}

export function filterGeneratedReportsForHistory(items: N8nReportHistoryItem[]): N8nReportHistoryItem[] {
    return sortReportsByGeneratedAtDesc(
        items.filter((r) => {
            const st = String(r.status ?? "")
                .trim()
                .toLowerCase();
            const url = String(r.file_url ?? r.download_url ?? "").trim();
            return url && (st === "generated" || st === "ready");
        }),
    );
}

export function useReportsN8n(enterpriseId: string | undefined) {
    const eid = enterpriseId?.trim() || undefined;
    const qc = useQueryClient();

    const invalidate = () => {
        if (!eid) return;
        void qc.invalidateQueries({ queryKey: ["reports-history", eid] });
        void qc.invalidateQueries({ queryKey: ["reports-summary", eid] });
    };

    const loadHistory = async () => {
        if (!eid) return;
        await qc.invalidateQueries({ queryKey: ["reports-history", eid] });
        await qc.refetchQueries({ queryKey: ["reports-history", eid], type: "active" });
    };

    const summaryQuery = useQuery({
        queryKey: ["reports-summary", eid],
        queryFn: () => getReportsSummary(eid!).then((r) => r.data),
        enabled: Boolean(eid),
        retry: false,
        staleTime: 30_000,
    });

    const historyQuery = useQuery({
        queryKey: ["reports-history", eid],
        queryFn: async () => {
            const limit = 50;
            console.log("REPORTS HISTORY PRIMARY URL:", buildReportsHistoryRequestUrl(eid!, limit));

            const data = await fetchReportsHistory(eid!, { limit });
            const body = unwrapHistoryEnvelope(data) ?? asRecord(data);

            console.log("REPORTS HISTORY RAW RESPONSE:", data);
            console.log("REPORTS HISTORY RESPONSE REPORTS:", body?.reports);
            console.log("REPORTS HISTORY COUNT:", body?.count);

            const parsed = parseReportsHistoryResponse(data);
            console.log("reports.display.length:", parsed.display.length);
            console.table(parsed.display);

            return parsed;
        },
        enabled: Boolean(eid),
        retry: false,
        staleTime: 15_000,
        refetchOnMount: "always",
    });

    const reports = useMemo(
        (): ReportsHistoryQueryResult => ({
            display: historyQuery.data?.display ?? [],
            all: historyQuery.data?.all ?? [],
        }),
        [historyQuery.data],
    );

    const removeReportFromHistoryCache = useCallback(
        (reportId: string) => {
            if (!eid) return;
            qc.setQueryData<ReportsHistoryQueryResult>(["reports-history", eid], (old) => {
                if (!old) return old;
                const id = reportId.trim();
                return {
                    display: old.display.filter((r) => r.reportId !== id),
                    all: old.all.filter((r) => r.reportId !== id),
                };
            });
        },
        [qc, eid],
    );

    const boardPackMutation = useMutation({
        mutationFn: (body: Record<string, unknown>) => generateBoardPack(body).then((r) => r.data as GenerateReportResponse),
        onSuccess: async () => {
            invalidate();
            await loadHistory();
        },
    });

    const projectDossierMutation = useMutation({
        mutationFn: (body: Record<string, unknown>) => generateProjectDossier(body).then((r) => r.data as GenerateReportResponse),
        onSuccess: async () => {
            invalidate();
            await loadHistory();
        },
    });

    const sendEmailMutation = useMutation({
        mutationFn: (body: SendReportEmailPayload) => sendReportEmail(body).then((r) => r.data),
    });

    const scheduleMutation = useMutation({
        mutationFn: (body: ScheduleReportPayload) => scheduleReport(body).then((r) => r.data),
    });

    const deleteReportMutation = useMutation({
        mutationFn: (reportId: string) => {
            if (!eid) throw new Error("enterprise_id requis");
            return deleteReport(eid, reportId);
        },
        onSuccess: (data, reportId) => {
            if (data.success) {
                removeReportFromHistoryCache(reportId);
                void qc.invalidateQueries({ queryKey: ["reports-summary", eid] });
            }
        },
    });

    return {
        enterpriseId: eid,
        summaryQuery,
        historyQuery,
        reports,
        loadHistory,
        removeReportFromHistoryCache,
        boardPackMutation,
        projectDossierMutation,
        sendEmailMutation,
        scheduleMutation,
        deleteReportMutation,
        invalidate,
    };
}
