import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    generateBoardPack,
    generateProjectDossier,
    getReportsHistory,
    getReportsSummary,
    scheduleReport,
    sendReportEmail,
    type GenerateReportResponse,
    type ScheduleReportPayload,
    type SendReportEmailPayload,
} from "@/api/reports.api";

export type N8nReportHistoryItem = {
    report_id: string;
    name: string;
    type: string;
    generated_at: string;
    status: string;
    size_bytes?: number;
    /** URL directe du PDF (Supabase / n8n). */
    file_url?: string;
    /** Alias historique — aligné sur `file_url` lors de la normalisation. */
    download_url?: string;
    project_id?: string;
    metadata?: Record<string, unknown>;
};

function asRecord(v: unknown): Record<string, unknown> | null {
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Fusionne les champs souvent encapsulés par n8n (`json`, `body`). */
function flattenN8nRow(raw: unknown): Record<string, unknown> | null {
    const r = asRecord(raw);
    if (!r) return null;
    const fromJson = asRecord(r.json);
    const fromBody = asRecord(r.body);
    if (fromJson) return { ...r, ...fromJson };
    if (fromBody) return { ...r, ...fromBody };
    return r;
}

function normalizeHistoryItem(raw: unknown): N8nReportHistoryItem | null {
    const r = flattenN8nRow(raw);
    if (!r) return null;
    const reportId = r.report_id ?? r.reportId ?? r.id ?? r.uuid;
    if (reportId == null || String(reportId).trim() === "") return null;
    const meta = asRecord(r.metadata);
    const fileUrlFromMeta =
        meta != null
            ? String(meta.file_url ?? meta.fileUrl ?? meta.url ?? meta.public_url ?? meta.download_url ?? "").trim() || undefined
            : undefined;
    const fileUrlRaw = r.file_url ?? r.fileUrl ?? r.download_url ?? r.url ?? r.public_url ?? fileUrlFromMeta;
    const fileUrl =
        fileUrlRaw != null && String(fileUrlRaw).trim() !== "" ? String(fileUrlRaw).trim() : undefined;
    const projectIdRaw = r.project_id ?? r.projectId;
    return {
        report_id: String(reportId),
        name: String(r.name ?? r.title ?? r.filename ?? `Rapport ${r.type ?? r.report_type ?? r.reportType ?? ""}`).trim() || "Rapport",
        type: String(r.type ?? r.kind ?? r.report_type ?? r.reportType ?? "—"),
        generated_at: String(r.generated_at ?? r.generatedAt ?? r.created_at ?? r.createdAt ?? ""),
        status: String(r.status ?? "Prêt"),
        size_bytes:
            r.size_bytes != null
                ? Number(r.size_bytes)
                : r.sizeBytes != null
                  ? Number(r.sizeBytes)
                  : r.size != null
                    ? Number(r.size)
                    : r.file_size != null
                      ? Number(r.file_size)
                      : r.fileSize != null
                        ? Number(r.fileSize)
                        : undefined,
        file_url: fileUrl,
        download_url: fileUrl,
        project_id: projectIdRaw != null ? String(projectIdRaw) : undefined,
        ...(meta ? { metadata: meta } : {}),
    };
}

/** Clés souvent utilisées par n8n / REST pour une liste de rapports. */
const REPORT_LIST_KEYS = [
    "data",
    "result",
    "history",
    "reports",
    "reports_history",
    "items",
    "entries",
    "rows",
    "records",
] as const;

function collectReportArraysFromRecord(rec: Record<string, unknown>): unknown[][] {
    const out: unknown[][] = [];
    for (const k of REPORT_LIST_KEYS) {
        const v = rec[k as string];
        if (Array.isArray(v)) out.push(v);
    }
    return out;
}

function longestArray(arrays: unknown[][]): unknown[] {
    if (!arrays.length) return [];
    return arrays.reduce((best, cur) => (cur.length > best.length ? cur : best));
}

/**
 * Extrait le tableau de rapports depuis la charge utile GET /reports/history.
 * Plusieurs clés peuvent contenir un tableau (ex. `items` = dernier seul, `history` = liste complète) :
 * on retient le tableau le plus long pour éviter d’afficher une seule ligne.
 */
function extractReportsArray(payload: unknown, depth = 0): unknown[] {
    if (depth > 8) return [];
    if (typeof payload === "string") {
        try {
            return extractReportsArray(JSON.parse(payload) as unknown, depth + 1);
        } catch {
            return [];
        }
    }
    if (Array.isArray(payload)) return payload;
    const o = asRecord(payload);
    if (!o) return [];

    const atRoot = collectReportArraysFromRecord(o);
    if (atRoot.length) return longestArray(atRoot);

    const nestedCandidates = [asRecord(o.data), asRecord(o.json), asRecord(o.body), asRecord(o.payload), asRecord(o.result)];
    for (const nested of nestedCandidates) {
        if (!nested) continue;
        const inner = collectReportArraysFromRecord(nested);
        if (inner.length) return longestArray(inner);
    }
    for (const nested of nestedCandidates) {
        if (nested) {
            const deeper = extractReportsArray(nested, depth + 1);
            if (deeper.length) return deeper;
        }
    }
    return [];
}

export function normalizeReportsHistoryPayload(payload: unknown): N8nReportHistoryItem[] {
    return extractReportsArray(payload)
        .map(normalizeHistoryItem)
        .filter((x): x is N8nReportHistoryItem => x != null);
}

export function useReportsN8n(enterpriseId: string | undefined) {
    const eid = enterpriseId?.trim() || undefined;
    const qc = useQueryClient();

    const invalidate = () => {
        if (!eid) return;
        void qc.invalidateQueries({ queryKey: ["reports-history", eid] });
        void qc.invalidateQueries({ queryKey: ["reports-summary", eid] });
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
        queryFn: () => getReportsHistory(eid!).then((r) => normalizeReportsHistoryPayload(r.data)),
        enabled: Boolean(eid),
        retry: false,
        staleTime: 15_000,
    });

    const boardPackMutation = useMutation({
        mutationFn: (body: Record<string, unknown>) => generateBoardPack(body).then((r) => r.data as GenerateReportResponse),
        onSuccess: () => invalidate(),
    });

    const projectDossierMutation = useMutation({
        mutationFn: (body: Record<string, unknown>) => generateProjectDossier(body).then((r) => r.data as GenerateReportResponse),
        onSuccess: () => invalidate(),
    });

    const sendEmailMutation = useMutation({
        mutationFn: (body: SendReportEmailPayload) => sendReportEmail(body).then((r) => r.data),
    });

    const scheduleMutation = useMutation({
        mutationFn: (body: ScheduleReportPayload) => scheduleReport(body).then((r) => r.data),
    });

    return {
        enterpriseId: eid,
        summaryQuery,
        historyQuery,
        boardPackMutation,
        projectDossierMutation,
        sendEmailMutation,
        scheduleMutation,
        invalidate,
    };
}
