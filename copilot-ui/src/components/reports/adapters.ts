import type { DashboardResponse, DecisionLabel, ProjectKpi } from "@/types/api.types";
import type { N8nReportHistoryItem } from "@/hooks/use-reports-n8n";
import type {
    DecisionDistribution,
    FragileProject,
    HealthTimelinePoint,
    ReportFormat,
    ReportHistoryItem,
    ReportStatus,
    ReportTemplate,
    ReportType,
    ServiceHealth,
} from "./types";

const REPORT_TYPES: ReportType[] = [
    "board_pack",
    "project_dossier",
    "global_enterprise",
    "hr_talents",
    "risks_alerts",
    "decisions_ai",
];

export function coerceReportType(raw: string | undefined): ReportType {
    const t = String(raw ?? "")
        .trim()
        .toLowerCase();
    if (REPORT_TYPES.includes(t as ReportType)) return t as ReportType;
    if (t === "project_detail") return "project_dossier";
    return "board_pack";
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

function coerceReportStatus(raw: string | undefined, hasFile: boolean): ReportStatus {
    const s = String(raw ?? "")
        .trim()
        .toLowerCase();
    if (s === "failed" || s === "error") return "failed";
    if (s === "generating" || s === "pending" || s === "processing") return "generating";
    if (s === "archived") return "archived";
    if (
        s === "generated" ||
        s === "ready" ||
        s === "prêt" ||
        s === "success" ||
        s === "completed" ||
        s === "done" ||
        (hasFile && s === "")
    ) {
        return "ready";
    }
    return hasFile ? "ready" : "generating";
}

function normalizeFragileDecision(d: DecisionLabel | string | undefined): FragileProject["decision"] {
    if (d === "Continue" || d === "Adjust" || d === "Stop") return d;
    return "Adjust";
}

export function decisionsFromDashboard(kpi: DashboardResponse["kpi_cards"] | undefined): DecisionDistribution {
    const d = kpi?.decisions;
    return {
        continue: d?.continue ?? 0,
        adjust: d?.adjust ?? 0,
        stop: d?.stop ?? 0,
        unscored: d?.unscored ?? 0,
    };
}

/** Placeholder 7j : même score (en attendant `GET /reports/health-trend`). */
export function buildHealthTimelinePlaceholder(score: number | null | undefined): HealthTimelinePoint[] {
    const s = score != null && Number.isFinite(score) ? Number(score) : 0;
    const out: HealthTimelinePoint[] = [];
    for (let i = 6; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        out.push({ date: d.toISOString().slice(0, 10), score: s });
    }
    return out;
}

export function fragileProjectsForCharts(rows: ProjectKpi[] | undefined): FragileProject[] {
    return (rows ?? []).slice(0, 8).map((p) => ({
        id: p.id,
        name: p.name,
        score: p.viability_score != null && Number.isFinite(Number(p.viability_score)) ? Number(p.viability_score) : 0,
        decision: normalizeFragileDecision(p.decision),
    }));
}

export function mapN8nReportToHistoryItem(raw: N8nReportHistoryItem, meta?: { format?: string; generatedBy?: string }): ReportHistoryItem {
    const rec = raw as Record<string, unknown>;
    const nestedMeta =
        rec.metadata != null && typeof rec.metadata === "object" && !Array.isArray(rec.metadata)
            ? (rec.metadata as Record<string, unknown>)
            : undefined;
    const fileUrlFromMeta =
        nestedMeta != null
            ? String(nestedMeta.file_url ?? nestedMeta.fileUrl ?? nestedMeta.url ?? nestedMeta.public_url ?? nestedMeta.download_url ?? "").trim() ||
              null
            : null;
    const fileUrl = raw.file_url ?? raw.download_url ?? fileUrlFromMeta ?? null;
    const type = coerceReportType(raw.type);
    const format = coerceReportFormat(meta?.format ?? nestedMeta?.format);
    const status = coerceReportStatus(raw.status, Boolean(fileUrl));
    const projectName =
        rec.project_name != null
            ? String(rec.project_name)
            : rec.projectName != null
              ? String(rec.projectName)
              : nestedMeta?.project_name != null
                ? String(nestedMeta.project_name)
                : null;
    const period = rec.period != null ? String(rec.period) : nestedMeta?.period != null ? String(nestedMeta.period) : null;
    const language = rec.language != null ? String(rec.language) : null;
    const generatedBy =
        meta?.generatedBy ??
        (rec.generated_by != null ? String(rec.generated_by) : nestedMeta?.generated_by != null ? String(nestedMeta.generated_by) : null);
    const fileSizeFromMeta =
        nestedMeta?.file_size != null && Number.isFinite(Number(nestedMeta.file_size))
            ? Number(nestedMeta.file_size)
            : undefined;

    return {
        reportId: raw.report_id,
        type,
        format,
        status,
        fileUrl,
        fileSize:
            raw.size_bytes != null && Number.isFinite(raw.size_bytes)
                ? raw.size_bytes
                : fileSizeFromMeta != null
                  ? fileSizeFromMeta
                  : null,
        generatedAt: raw.generated_at || new Date().toISOString(),
        generatedBy,
        projectName,
        period,
        language,
    };
}

function startOfMonthMs(): number {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function countGenerationsThisMonth(history: N8nReportHistoryItem[], reportType: ReportType): number {
    const start = startOfMonthMs();
    return history.filter((h) => {
        const t = coerceReportType(h.type);
        if (t !== reportType) return false;
        const ts = new Date(h.generated_at).getTime();
        return Number.isFinite(ts) && ts >= start;
    }).length;
}

export function lastGeneratedAtForType(history: N8nReportHistoryItem[], reportType: ReportType): string | null {
    const matches = history
        .filter((h) => coerceReportType(h.type) === reportType)
        .map((h) => new Date(h.generated_at).getTime())
        .filter((t) => Number.isFinite(t));
    if (!matches.length) return null;
    return new Date(Math.max(...matches)).toISOString();
}

export type ReportTemplateDefInput = {
    id: string;
    type: ReportType;
    title: string;
    description: string;
    dataSource: string;
    formats: ReportFormat[];
    primaryFormat: ReportFormat;
    isBackendGenerated: boolean;
};

export function enrichTemplatesWithHistory(defs: ReportTemplateDefInput[], history: N8nReportHistoryItem[]): ReportTemplate[] {
    return defs.map((d) => ({
        ...d,
        lastGeneratedAt: lastGeneratedAtForType(history, d.type),
        generationCount: countGenerationsThisMonth(history, d.type),
    }));
}

/** Parse optionnel `GET /system/health` (forme libre). */
export function parseSystemHealthPayload(payload: unknown): ServiceHealth[] {
    if (!payload || typeof payload !== "object") return [];
    const o = payload as Record<string, unknown>;
    const list = o.services ?? o.items ?? o.data;
    if (!Array.isArray(list)) return [];
    const out: ServiceHealth[] = [];
    for (const row of list) {
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        const name = String(r.name ?? r.id ?? "").trim();
        const label = String(r.label ?? r.title ?? name).trim();
        if (!name || !label) continue;
        const statusRaw = String(r.status ?? "unknown").toLowerCase();
        const status =
            statusRaw === "ok" || statusRaw === "healthy"
                ? "ok"
                : statusRaw === "degraded" || statusRaw === "warning"
                  ? "degraded"
                  : statusRaw === "down" || statusRaw === "error"
                    ? "down"
                    : "unknown";
        const latencyMs =
            typeof r.latencyMs === "number"
                ? r.latencyMs
                : typeof r.latency_ms === "number"
                  ? r.latency_ms
                  : null;
        const details = r.details != null ? String(r.details) : undefined;
        const lastCheckAt = r.lastCheckAt != null ? String(r.lastCheckAt) : r.last_check_at != null ? String(r.last_check_at) : null;
        let meta: Record<string, string | number> | undefined;
        if (r.meta && typeof r.meta === "object" && !Array.isArray(r.meta)) {
            meta = {};
            for (const [k, v] of Object.entries(r.meta as Record<string, unknown>)) {
                if (typeof v === "number" && Number.isFinite(v)) meta[k] = v;
                else if (typeof v === "string" || typeof v === "number") meta[k] = String(v);
            }
        }
        out.push({ name, label, status, latencyMs, details, lastCheckAt, meta });
    }
    return out;
}
