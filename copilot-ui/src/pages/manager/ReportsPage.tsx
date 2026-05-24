import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import type { ScheduleReportPayload } from "@/api/reports.api";
import { ReportTemplateCard, type ReportFormat, type ReportHistoryItem, type ReportTemplate } from "@/components/reports";
import {
    FAVORITES_STORAGE_KEY,
    QuickActionsBar,
    ReportPreviewPanel,
    ReportsAutomationDrawer,
    ReportsAutomationSection,
    ReportsHeader,
    ReportsHistoryTimeline,
    ReportsQuickFilters,
    ReportsTabs,
    templateMatchesAudience,
    type AutomationDrawerValues,
    type ReportAudience,
} from "@/components/manager/reports";
import {
    frequencyLabel,
    loadAutomations,
    mapFrequencyToApi,
    mapTemplateToApiType,
    saveAutomations,
    type ReportAutomation,
} from "@/components/manager/reports/reports-automation";
import { coerceReportType, enrichTemplatesWithHistory, type ReportTemplateDefInput } from "@/components/reports/adapters";
import { labelReportType } from "@/components/reports/utils";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useReportsData } from "@/hooks/useReports";
import { historyItemToN8n, useReportsN8n, type N8nReportHistoryItem } from "@/hooks/use-reports-n8n";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import type { CopilotDecision } from "@/services/decisions.api";
import type { DashboardResponse, ProjectKpi, TopAlert } from "@/types/api.types";
import { cx } from "@/utils/cx";
import { uuidv4 } from "@/utils/uuid";

const HISTORY_KEY = "executive-report-center-history-v1";
const MAX_HISTORY = 40;

type ReportRange = "7d" | "30d" | "90d";
type ExportFormat = "pdf" | "csv" | "xlsx";
type DetailLevel = "summary" | "standard" | "full";
type ReportHistoryKind = "decisions_csv" | "alerts_csv" | "enterprise_csv" | "rh_csv" | "project_csv" | "print";

export interface ReportHistoryRow {
    id: string;
    name: string;
    type: string;
    kind: ReportHistoryKind;
    createdAt: string;
    status: "Prêt" | "En attente backend";
    sizeLabel?: string;
    range: ReportRange;
    projectId?: string;
}

function rangeToMs(r: ReportRange): number {
    if (r === "7d") return 7 * 86400000;
    if (r === "30d") return 30 * 86400000;
    return 90 * 86400000;
}

function confidencePercent(c: number | undefined): number {
    if (c == null || Number.isNaN(c)) return 0;
    if (c <= 1 && c >= 0) return Math.round(c * 100);
    return Math.min(100, Math.max(0, Math.round(c)));
}

function decisionScore(value: unknown): number | null {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function downloadCsv(filename: string, csv: string): { size: number } {
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return { size: blob.size };
}

function formatBytes(n: number): string {
    if (n < 1024) return `${n} o`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
    return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Ouvre l’URL publique du PDF (Supabase) dans un nouvel onglet / téléchargement. */
function openReportPdfUrl(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = "";
    a.click();
}

function axiosErrorMessage(err: unknown, fallback: string): string {
    if (isAxiosError(err)) {
        const data = err.response?.data as Record<string, unknown> | undefined;
        const msg = data?.message ?? data?.error ?? data?.detail;
        if (typeof msg === "string" && msg.trim()) return msg.trim();
        if (err.response?.status) return `${fallback} (HTTP ${err.response.status})`;
    }
    return fallback;
}

/** Période UI → paramètre attendu par n8n (Validate board input). */
function rangeToN8nPeriod(r: ReportRange): string {
    if (r === "7d") return "last_7_days";
    if (r === "30d") return "last_30_days";
    return "last_90_days";
}

/** Erreurs génération PDF (PDFShift, réseau, 400/500). */
function reportGenerationErrorMessage(err: unknown, tr: (k: string) => string): string {
    if (isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data as Record<string, unknown> | undefined;
        const blob = `${JSON.stringify(data ?? {})} ${err.message ?? ""}`;
        if (/pdfshift|pdf.?shift/i.test(blob)) return tr("errPdfServiceDown");
        if (status === 400) {
            const msg = data?.message ?? data?.error ?? data?.detail;
            if (typeof msg === "string" && msg.trim()) return msg.trim();
        }
        if (status != null && status >= 500) return tr("errReportGeneration");
        if (!err.response) return tr("errReportGeneration");
        const msg = data?.message ?? data?.error ?? data?.detail;
        if (typeof msg === "string" && msg.trim()) return msg.trim();
        return tr("errReportGeneration");
    }
    return tr("errReportGeneration");
}

/** PDF disponible + statut non bloquant (aligné historique : generated, ready, etc.). */
function isEligibleReportForEmailItem(r: ReportHistoryItem): boolean {
    const rid = String(r.reportId ?? "").trim();
    if (!rid) return false;
    if (!String(r.fileUrl ?? "").trim()) return false;
    const st = String(r.apiStatus ?? "").trim().toLowerCase();
    return !["failed", "error", "cancelled"].includes(st);
}

function formatReportSelectLabelFromItem(r: ReportHistoryItem, locale: string): string {
    const typeLabel = labelReportType(r.type);
    const d = new Date(r.generatedAt);
    const t = d.getTime();
    const dateStr = Number.isFinite(t)
        ? d.toLocaleString(locale === "ar" ? "ar" : locale === "en" ? "en-GB" : "fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "—";
    return `${typeLabel} — ${dateStr}`;
}

function parseRecipients(raw: string): string[] {
    return raw
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.includes("@"));
}

function loadHistory(): ReportHistoryRow[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as ReportHistoryRow[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveHistory(rows: ReportHistoryRow[]) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(rows.slice(0, MAX_HISTORY)));
}

function loadFavorites(): Set<string> {
    try {
        const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw) as string[];
        return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
        return new Set();
    }
}

function saveFavorites(ids: Set<string>) {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...ids]));
}

function buildDecisionsCsv(decisions: CopilotDecision[]): string {
    const headers = ["Date", "Décision", "Projet", "Score", "Confiance", "Raison"];
    const rows = decisions.map((d) => [
        new Date(d.created_at).toLocaleDateString("fr-FR"),
        d.decision,
        d.project_name ?? "",
        decisionScore(d.score)?.toFixed(2) ?? "",
        `${confidencePercent(d.confidence)}%`,
        (d.reason ?? "").replace(/"/g, '""'),
    ]);
    return [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
}

function buildAlertsCsv(alerts: TopAlert[]): string {
    const headers = ["Sévérité", "Projet", "Type risque", "Titre", "Message", "Date"];
    const rows = alerts.map((a) => [
        a.severity ?? "",
        a.project_name ?? "",
        a.risk_type ?? "",
        (a.title ?? "").replace(/"/g, '""'),
        (a.message ?? "").replace(/"/g, '""'),
        a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR") : "",
    ]);
    return [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
}

function buildEnterpriseCsv(params: {
    kpi: DashboardResponse["kpi_cards"] | undefined;
    health: DashboardResponse["health"] | undefined;
    fragile: ProjectKpi[];
    range: ReportRange;
    rangeLabel: string;
}): string {
    const lines: string[][] = [];
    lines.push(["Section", "Indicateur", "Valeur"]);
    lines.push(["Période", "Fenêtre", params.rangeLabel]);
    lines.push(["Projets", "Actifs", String(params.kpi?.projects?.active ?? "")]);
    lines.push(["Projets", "Total", String(params.kpi?.projects?.total ?? "")]);
    lines.push(["Alertes", "Ouvertes (KPI)", String(params.kpi?.alerts?.total_open ?? "")]);
    lines.push(["Alertes", "Critiques / High", String(params.kpi?.alerts?.critical_or_high ?? "")]);
    lines.push(["Équipe", "Taille", String(params.kpi?.team?.size ?? "")]);
    lines.push(["Équipe", "Surchargés", String(params.kpi?.team?.overloaded ?? "")]);
    lines.push(["Santé", "Score", params.health?.score != null ? String(params.health.score) : ""]);
    lines.push(["Santé", "Libellé", (params.health?.label ?? "").replace(/"/g, '""')]);
    params.fragile.slice(0, 20).forEach((p) => {
        lines.push(["Projet sensible", (p.name ?? "").replace(/"/g, '""'), String(p.viability_score ?? "")]);
    });
    return lines.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
}

function buildRhCsv(kpi: DashboardResponse["kpi_cards"] | undefined): string {
    const lines: string[][] = [["Indicateur", "Valeur"]];
    lines.push(["Taille équipe", String(kpi?.team?.size ?? "")]);
    lines.push(["Talents surchargés", String(kpi?.team?.overloaded ?? "")]);
    lines.push(["Actions RH en attente", String(kpi?.pending_rh_actions ?? "")]);
    return lines.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
}

function buildProjectCsv(decisions: CopilotDecision[], projectName: string): string {
    const headers = ["Date", "Décision", "Score", "Confiance", "Raison"];
    const rows = decisions.map((d) => [
        new Date(d.created_at).toLocaleDateString("fr-FR"),
        d.decision,
        decisionScore(d.score)?.toFixed(2) ?? "",
        `${confidencePercent(d.confidence)}%`,
        (d.reason ?? "").replace(/"/g, '""'),
    ]);
    const intro = `"Rapport projet","${projectName.replace(/"/g, '""')}"\n`;
    return intro + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
}

function aiRecommendationBullets(
    data: ReturnType<typeof useReportsData>["data"],
    decisionsInRange: CopilotDecision[],
    tr: (k: string, opts?: Record<string, string | number>) => string,
): string[] {
    const out: string[] = [];
    const h = data.health?.score;
    if (h != null) {
        if (h < 5) out.push(tr("aiBulletHealthLow"));
        else if (h < 7.5) out.push(tr("aiBulletHealthMid"));
        else out.push(tr("aiBulletHealthHigh"));
    }
    const stopAdj = decisionsInRange.filter((d) => d.decision === "Stop" || d.decision === "Adjust").length;
    if (decisionsInRange.length && stopAdj / decisionsInRange.length > 0.35) {
        out.push(tr("aiBulletStopAdjustHigh"));
    }
    const crit = Number(data.summary?.critical ?? 0) + Number(data.summary?.high ?? 0);
    if (crit > 0) {
        out.push(tr("aiBulletCriticalAlerts", { count: crit }));
    }
    const fragile = data.widgets?.fragile_projects?.length ?? 0;
    if (fragile > 0) {
        out.push(tr("aiBulletFragile", { count: fragile, boardPack: tr("boardPackInAiBullets") }));
    }
    return out.slice(0, 5);
}

export default function ReportsPage() {
    const { t, i18n } = useTranslation("common");
    const tr = useCallback(
        (key: string, opts?: Record<string, string | number>) =>
            t(`managerWorkspace.reportsPage.${key}`, opts as Record<string, unknown> | undefined),
        [t],
    );

    useWorkspaceTopbarMeta(tr("pageHeroTitle"), tr("pageHeroSubtitle"));

    const { push } = useToast();
    const [range, setRange] = useState<ReportRange>("30d");
    const [paramProject, setParamProject] = useState<string>("all");
    const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
    const [language, setLanguage] = useState<"fr" | "en">("fr");
    const [detailLevel, setDetailLevel] = useState<DetailLevel>("standard");
    const [includeCharts, setIncludeCharts] = useState(true);
    const [includeAi, setIncludeAi] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<string>("global_enterprise");
    const [history, setHistory] = useState<ReportHistoryRow[]>([]);
    const [lastGenerated, setLastGenerated] = useState<{ report_id?: string; type?: string; file_url?: string } | null>(null);
    const [emailReportId, setEmailReportId] = useState("");
    const [emailRecipients, setEmailRecipients] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [scheduleType, setScheduleType] = useState<"board_pack" | "project_dossier">("board_pack");
    const [scheduleFreq, setScheduleFreq] = useState<"weekly" | "monthly">("weekly");
    const [scheduleRecipients, setScheduleRecipients] = useState("");
    const [scheduleLang, setScheduleLang] = useState("fr");
    const [scheduleProjectId, setScheduleProjectId] = useState("all");
    const [reportsTab, setReportsTab] = useState<"generation" | "history" | "automation">("generation");
    const [generatingTemplateId, setGeneratingTemplateId] = useState<string | null>(null);
    const [audienceFilter, setAudienceFilter] = useState<ReportAudience>("all");
    const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
    const [automations, setAutomations] = useState<ReportAutomation[]>(() => loadAutomations());
    const [automationDrawerOpen, setAutomationDrawerOpen] = useState(false);
    const [editingAutomation, setEditingAutomation] = useState<ReportAutomation | null>(null);
    const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
    const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

    const { user } = useAuth();
    const enterpriseId = (user?.enterpriseId ?? (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined) ?? "").trim();
    const reportsN8n = useReportsN8n(enterpriseId || undefined);

    const rangeLabel = useCallback(
        (r: ReportRange) => {
            if (r === "7d") return tr("range7d");
            if (r === "30d") return tr("range30d");
            return tr("range90d");
        },
        [tr],
    );

    const templateDefs = useMemo(
        () =>
            [
                {
                    id: "board_pack" as const,
                    title: tr("templateBoardPackTitle"),
                    description: tr("templateBoardPackDesc"),
                    data: tr("templateBoardPackData"),
                    formats: ["PDF", "CSV", "Excel"] as const,
                    pdfOnly: false,
                },
                {
                    id: "global_enterprise" as const,
                    title: tr("templateGlobalTitle"),
                    description: tr("templateGlobalDesc"),
                    data: tr("templateGlobalData"),
                    formats: ["PDF", "CSV", "Excel"] as const,
                    pdfOnly: false,
                },
                {
                    id: "project_detail" as const,
                    title: tr("templateProjectTitle"),
                    description: tr("templateProjectDesc"),
                    data: tr("templateProjectData"),
                    formats: ["PDF", "CSV", "Excel"] as const,
                    pdfOnly: false,
                },
                {
                    id: "rh_talents" as const,
                    title: tr("templateRhTitle"),
                    description: tr("templateRhDesc"),
                    data: tr("templateRhData"),
                    formats: ["PDF", "CSV", "Excel"] as const,
                    pdfOnly: false,
                },
                {
                    id: "risks_alerts" as const,
                    title: tr("templateRisksTitle"),
                    description: tr("templateRisksDesc"),
                    data: tr("templateRisksData"),
                    formats: ["PDF", "CSV", "Excel"] as const,
                    pdfOnly: false,
                },
                {
                    id: "decisions_ai" as const,
                    title: tr("templateDecisionsTitle"),
                    description: tr("templateDecisionsDesc"),
                    data: tr("templateDecisionsData"),
                    formats: ["PDF", "CSV", "Excel"] as const,
                    pdfOnly: false,
                },
            ] as const,
        [tr],
    );

    const reportTemplateDefInputs = useMemo((): ReportTemplateDefInput[] => {
        const toFormat = (f: string): ReportFormat => {
            const x = f.toLowerCase();
            if (x === "pdf") return "pdf";
            if (x === "excel" || x === "xlsx") return "excel";
            if (x === "print") return "print";
            return "csv";
        };
        const typeById: Record<(typeof templateDefs)[number]["id"], ReportTemplateDefInput["type"]> = {
            board_pack: "board_pack",
            global_enterprise: "global_enterprise",
            project_detail: "project_dossier",
            rh_talents: "hr_talents",
            risks_alerts: "risks_alerts",
            decisions_ai: "decisions_ai",
        };
        return templateDefs.map((tpl) => {
            const formats = tpl.formats.map(toFormat);
            let primaryFormat: ReportFormat = "csv";
            if (tpl.id === "board_pack" || tpl.id === "project_detail") primaryFormat = "pdf";
            else if (formats.includes("pdf")) primaryFormat = "pdf";
            else primaryFormat = formats[0] ?? "csv";
            return {
                id: tpl.id,
                type: typeById[tpl.id],
                title: tpl.title,
                description: tpl.description,
                dataSource: tpl.data,
                formats,
                primaryFormat,
                isBackendGenerated: tpl.id === "board_pack" || tpl.id === "project_detail",
            };
        });
    }, [templateDefs]);

    const { isLoading, isError, data } = useReportsData();

    useEffect(() => {
        setHistory(loadHistory());
    }, []);

    const persist = useCallback((row: ReportHistoryRow) => {
        setHistory((prev) => {
            const next = [row, ...prev.filter((r) => r.id !== row.id)].slice(0, MAX_HISTORY);
            saveHistory(next);
            return next;
        });
    }, []);

    const decisionsInRange = useMemo(() => {
        const ms = rangeToMs(range);
        const cutoff = Date.now() - ms;
        return data.decisions.filter((d) => new Date(d.created_at).getTime() >= cutoff);
    }, [data.decisions, range]);

    const decisionsForProject = useMemo(() => {
        if (paramProject === "all") return decisionsInRange;
        return decisionsInRange.filter((d) => d.project_id === paramProject);
    }, [decisionsInRange, paramProject]);

    const fragile = data.widgets?.fragile_projects ?? [];
    const alerts = data.alerts;
    const projects = data.projects;

    const previewStats = useMemo(() => {
        const projectsIncluded =
            paramProject === "all" ? (data.kpi?.projects?.total ?? (projects.length || fragile.length || 0)) : 1;
        const decisionsCount = paramProject === "all" ? decisionsInRange.length : decisionsForProject.length;
        const alertsCount = alerts.length;
        const talents = data.kpi?.team?.size ?? 0;
        const sections: string[] = [tr("previewSectionCover"), tr("previewSectionKpis"), tr("previewSectionDecisions")];
        if (detailLevel !== "summary") sections.push(tr("previewSectionAlerts"));
        if (detailLevel === "full") sections.push(tr("previewSectionFragile"));
        if (includeCharts) sections.push(tr("previewSectionCharts"));
        if (includeAi) sections.push(tr("previewSectionAi"));
        const pageEst =
            3 +
            (detailLevel === "full" ? 5 : detailLevel === "standard" ? 3 : 2) +
            (includeCharts ? 2 : 0) +
            Math.min(8, Math.ceil(decisionsCount / 20)) +
            Math.min(4, Math.ceil(Number(projectsIncluded) / 6));
        return { projectsIncluded, decisionsCount, alertsCount, talents, sections, pageEst };
    }, [
        paramProject,
        data.kpi?.projects?.total,
        projects.length,
        fragile.length,
        decisionsInRange.length,
        decisionsForProject.length,
        alerts.length,
        data.kpi?.team?.size,
        detailLevel,
        includeCharts,
        includeAi,
        tr,
    ]);

    const aiBullets = useMemo(() => {
        if (!includeAi || isLoading) return [];
        return aiRecommendationBullets(data, decisionsInRange, tr);
    }, [includeAi, isLoading, data, decisionsInRange, tr]);

    const previewDataReady = !isLoading;

    const volumeBars = useMemo(() => {
        const ms = rangeToMs(range);
        const now = Date.now();
        const start = now - ms;
        const buckets = range === "7d" ? 7 : range === "30d" ? 10 : 12;
        const w = (now - start) / buckets;
        const max = Math.max(1, ...Array.from({ length: buckets }, (_, i) => {
            const b0 = start + i * w;
            const b1 = start + (i + 1) * w;
            return decisionsInRange.filter((d) => {
                const t = new Date(d.created_at).getTime();
                return t >= b0 && t < b1;
            }).length;
        }));
        return Array.from({ length: buckets }, (_, i) => {
            const b0 = start + i * w;
            const b1 = start + (i + 1) * w;
            const count = decisionsInRange.filter((d) => {
                const t = new Date(d.created_at).getTime();
                return t >= b0 && t < b1;
            }).length;
            const label =
                range === "7d"
                    ? new Date(b0).toLocaleDateString(i18n.language === "ar" ? "ar" : i18n.language === "en" ? "en-GB" : "fr-FR", {
                          weekday: "short",
                          day: "numeric",
                      })
                    : tr("weekSliceLabel", { n: i + 1 });
            return { label, count, hPct: Math.round((count / max) * 100) };
        });
    }, [decisionsInRange, range, tr, i18n.language]);

    const pushCsvHistory = useCallback(
        (name: string, typeLabel: string, kind: ReportHistoryKind, filename: string, csv: string) => {
            const { size } = downloadCsv(filename, csv);
            persist({
                id: uuidv4(),
                name,
                type: typeLabel,
                kind,
                createdAt: new Date().toISOString(),
                status: "Prêt",
                sizeLabel: formatBytes(size),
                range,
                projectId: paramProject !== "all" ? paramProject : undefined,
            });
            push(tr("toastCsvExported"), "success");
        },
        [persist, push, range, paramProject, tr],
    );

    const exportDecisions = useCallback(() => {
        const csv = buildDecisionsCsv(decisionsInRange);
        pushCsvHistory(
            `Décisions IA — ${rangeLabel(range)}`,
            "CSV",
            "decisions_csv",
            `rapport-decisions-ia-${range}-${new Date().toISOString().slice(0, 10)}.csv`,
            csv,
        );
    }, [decisionsInRange, pushCsvHistory, range, rangeLabel]);

    const exportAlerts = useCallback(() => {
        const csv = buildAlertsCsv(alerts);
        pushCsvHistory(
            `Risques & alertes — ${rangeLabel(range)}`,
            "CSV",
            "alerts_csv",
            `rapport-alertes-${range}-${new Date().toISOString().slice(0, 10)}.csv`,
            csv,
        );
    }, [alerts, pushCsvHistory, range, rangeLabel]);

    const exportEnterprise = useCallback(() => {
        const csv = buildEnterpriseCsv({ kpi: data.kpi, health: data.health, fragile, range, rangeLabel: rangeLabel(range) });
        pushCsvHistory(
            `Rapport global entreprise — ${rangeLabel(range)}`,
            "CSV",
            "enterprise_csv",
            `rapport-global-${range}-${new Date().toISOString().slice(0, 10)}.csv`,
            csv,
        );
    }, [data.health, data.kpi, fragile, pushCsvHistory, range, rangeLabel]);

    const exportRh = useCallback(() => {
        const csv = buildRhCsv(data.kpi);
        pushCsvHistory(`RH & talents — ${rangeLabel(range)}`, "CSV", "rh_csv", `rapport-rh-talents-${range}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }, [data.kpi, pushCsvHistory, range, rangeLabel]);

    const exportProject = useCallback(() => {
        if (paramProject === "all") {
            push(tr("toastPickProjectReport"), "error");
            return;
        }
        const name = projects.find((p) => p.id === paramProject)?.name ?? "Projet";
        const csv = buildProjectCsv(decisionsForProject, name);
        pushCsvHistory(
            `Rapport projet — ${name}`,
            "CSV",
            "project_csv",
            `rapport-projet-${paramProject}-${new Date().toISOString().slice(0, 10)}.csv`,
            csv,
        );
    }, [decisionsForProject, paramProject, projects, pushCsvHistory, push, tr]);

    const runBoardPack = useCallback(() => {
        if (!enterpriseId) {
            push(tr("toastEnterpriseMissingSession"), "error");
            return;
        }
        reportsN8n.boardPackMutation.mutate(
            {
                enterprise_id: enterpriseId,
                period: rangeToN8nPeriod(range),
                language,
                includeCharts,
                includeAIRecommendations: includeAi,
            },
            {
                onSuccess: (res) => {
                    const ok = res?.success !== false && !res?.error;
                    if (!ok) {
                        push(String(res?.error ?? res?.message ?? tr("toastBoardPackFail")), "error");
                        return;
                    }
                    setLastGenerated({
                        report_id: res?.report_id,
                        type: res?.type ?? "board_pack",
                        file_url: res?.file_url,
                    });
                    push(tr("toastBoardPackOk"), "success");
                },
                onError: (err) => {
                    push(reportGenerationErrorMessage(err, tr), "error");
                },
            },
        );
    }, [enterpriseId, range, language, includeCharts, includeAi, reportsN8n.boardPackMutation, push, tr]);

    const runProjectDossier = useCallback(() => {
        if (!enterpriseId) {
            push(tr("toastEnterpriseMissingSession"), "error");
            return;
        }
        if (paramProject === "all") {
            push(tr("toastDossierNeedProject"), "error");
            return;
        }
        reportsN8n.projectDossierMutation.mutate(
            {
                enterprise_id: enterpriseId,
                project_id: paramProject,
                language,
                includeRisks: includeCharts,
                includeDecisions: includeAi,
                includeTeam: detailLevel !== "summary",
            },
            {
                onSuccess: (res) => {
                    const ok = res?.success !== false && !res?.error;
                    if (!ok) {
                        push(String(res?.error ?? res?.message ?? tr("toastDossierFail")), "error");
                        return;
                    }
                    setLastGenerated({
                        report_id: res?.report_id,
                        type: res?.type ?? "project_dossier",
                        file_url: res?.file_url,
                    });
                    push(tr("toastDossierOk"), "success");
                },
                onError: (err) => {
                    push(reportGenerationErrorMessage(err, tr), "error");
                },
            },
        );
    }, [enterpriseId, paramProject, language, includeCharts, includeAi, detailLevel, reportsN8n.projectDossierMutation, push, tr]);

    const onPrint = useCallback(() => {
        window.print();
        persist({
            id: uuidv4(),
            name: `Impression / PDF navigateur — ${rangeLabel(range)}`,
            type: "PDF",
            kind: "print",
            createdAt: new Date().toISOString(),
            status: "Prêt",
            sizeLabel: "—",
            range,
            projectId: paramProject !== "all" ? paramProject : undefined,
        });
        push(tr("toastPrintOpened"), "success");
    }, [persist, push, range, paramProject, rangeLabel, tr]);

    const regenerate = useCallback(
        (row: ReportHistoryRow) => {
            if (row.kind === "print") {
                window.print();
                push(tr("toastReprintLaunched"), "success");
                return;
            }
            const r = row.range;
            const ms = rangeToMs(r);
            const cutoff = Date.now() - ms;
            const decs = data.decisions.filter((d) => new Date(d.created_at).getTime() >= cutoff);
            const decsProj =
                row.projectId && row.kind === "project_csv" ? decs.filter((d) => d.project_id === row.projectId) : decs;
            const pname = row.projectId ? projects.find((p) => p.id === row.projectId)?.name ?? "Projet" : "";

            if (row.kind === "decisions_csv") {
                const csv = buildDecisionsCsv(decs);
                downloadCsv(`regen-decisions-${Date.now()}.csv`, csv);
            } else if (row.kind === "alerts_csv") {
                const csv = buildAlertsCsv(data.alerts);
                downloadCsv(`regen-alertes-${Date.now()}.csv`, csv);
            } else if (row.kind === "enterprise_csv") {
                const csv = buildEnterpriseCsv({
                    kpi: data.kpi,
                    health: data.health,
                    fragile: data.widgets?.fragile_projects ?? [],
                    range: r,
                    rangeLabel: rangeLabel(r),
                });
                downloadCsv(`regen-global-${Date.now()}.csv`, csv);
            } else if (row.kind === "rh_csv") {
                const csv = buildRhCsv(data.kpi);
                downloadCsv(`regen-rh-${Date.now()}.csv`, csv);
            } else if (row.kind === "project_csv" && row.projectId) {
                const csv = buildProjectCsv(decsProj, pname);
                downloadCsv(`regen-projet-${Date.now()}.csv`, csv);
            }
            push(tr("toastRegenDone"), "success");
        },
        [data.alerts, data.decisions, data.health, data.kpi, data.widgets?.fragile_projects, projects, push, tr, rangeLabel],
    );

    const downloadAgain = useCallback(
        (row: ReportHistoryRow) => {
            regenerate(row);
        },
        [regenerate],
    );

    const onTemplateGenerate = useCallback(
        (templateId: string) => {
            setSelectedTemplate(templateId);
            if (templateId === "board_pack") {
                runBoardPack();
                return;
            }
            if (templateId === "project_detail") {
                if (exportFormat === "pdf") {
                    runProjectDossier();
                    return;
                }
                if (exportFormat === "xlsx") {
                    push(tr("toastExcelSoon"), "error");
                    return;
                }
                exportProject();
                return;
            }
            if (templateId === "global_enterprise") {
                if (exportFormat === "xlsx") {
                    push(tr("toastExcelSoon"), "error");
                    return;
                }
                if (exportFormat === "pdf") {
                    runBoardPack();
                    return;
                }
                exportEnterprise();
                return;
            }
            if (templateId === "rh_talents") {
                exportRh();
                return;
            }
            if (templateId === "risks_alerts") {
                exportAlerts();
                return;
            }
            if (templateId === "decisions_ai") {
                exportDecisions();
            }
        },
        [exportAlerts, exportDecisions, exportEnterprise, exportProject, exportRh, exportFormat, push, runBoardPack, runProjectDossier, tr],
    );

    /** Historique serveur — camelCase, déjà normalisé dans use-reports-n8n (reports.display / reports.all). */
    const historyDisplay = reportsN8n.reports.display;
    const historyAll = reportsN8n.reports.all;

    const historyN8nForTemplates = useMemo(() => historyDisplay.map(historyItemToN8n), [historyDisplay]);

    const reportsWithPdfForEmail = useMemo(() => {
        const list = [...historyDisplay];
        const lid = lastGenerated?.report_id?.trim();
        const url = lastGenerated?.file_url?.trim();
        if (lid && url && !list.some((r) => r.reportId === lid)) {
            list.unshift({
                reportId: lid,
                title: labelReportType(coerceReportType(lastGenerated?.type)),
                type: coerceReportType(lastGenerated?.type),
                format: "pdf",
                status: "ready",
                apiStatus: "generated",
                fileUrl: url,
                fileSize: null,
                generatedAt: new Date().toISOString(),
                generatedBy: null,
                projectId: null,
                projectName: null,
                period: null,
                language: "fr",
            });
        }
        return list
            .filter(isEligibleReportForEmailItem)
            .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    }, [historyDisplay, lastGenerated]);
    const boardPackBusy = reportsN8n.boardPackMutation.isPending;
    const dossierBusy = reportsN8n.projectDossierMutation.isPending;

    useEffect(() => {
        if (emailReportId && !reportsWithPdfForEmail.some((r) => r.reportId === emailReportId)) {
            setEmailReportId("");
        }
    }, [emailReportId, reportsWithPdfForEmail]);

    const onServerRegenerate = useCallback(
        (row: N8nReportHistoryItem) => {
            if (!enterpriseId) return;
            const isProject = row.type?.toLowerCase().includes("project") || Boolean(row.project_id);
            if (isProject && row.project_id) {
                reportsN8n.projectDossierMutation.mutate(
                    {
                        enterprise_id: enterpriseId,
                        project_id: row.project_id,
                        language,
                        includeRisks: includeCharts,
                        includeDecisions: includeAi,
                        includeTeam: detailLevel !== "summary",
                    },
                    {
                        onSuccess: (res) => {
                            const ok = res?.success !== false && !res?.error;
                            if (ok) {
                                setLastGenerated({
                                    report_id: res?.report_id,
                                    type: res?.type ?? "project_dossier",
                                    file_url: res?.file_url,
                                });
                                push(tr("toastDossierRegenOk"), "success");
                            } else {
                                push(String(res?.error ?? tr("toastDossierRegenFail")), "error");
                            }
                        },
                        onError: (err) => push(reportGenerationErrorMessage(err, tr), "error"),
                    },
                );
            } else {
                runBoardPack();
            }
        },
        [
            enterpriseId,
            language,
            includeCharts,
            includeAi,
            detailLevel,
            reportsN8n.projectDossierMutation,
            push,
            tr,
            runBoardPack,
        ],
    );

    const enrichedTemplates = useMemo(
        () => enrichTemplatesWithHistory(reportTemplateDefInputs, historyN8nForTemplates),
        [reportTemplateDefInputs, historyN8nForTemplates],
    );

    useEffect(() => {
        if (!boardPackBusy && !dossierBusy) setGeneratingTemplateId(null);
    }, [boardPackBusy, dossierBusy]);

    const handleReportCardGenerate = useCallback(
        (tpl: ReportTemplate) => {
            setSelectedTemplate(tpl.id);
            setGeneratingTemplateId(tpl.id);
            if (tpl.isBackendGenerated && tpl.primaryFormat === "pdf") {
                if (tpl.id === "board_pack") {
                    runBoardPack();
                    return;
                }
                if (tpl.id === "project_detail") {
                    runProjectDossier();
                    return;
                }
            }
            onTemplateGenerate(tpl.id);
            queueMicrotask(() => setGeneratingTemplateId(null));
        },
        [onTemplateGenerate, runBoardPack, runProjectDossier],
    );

    const handleReportCardPreview = useCallback((tpl: ReportTemplate) => {
        setSelectedTemplate(tpl.id);
        if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
            setMobilePreviewOpen(true);
        } else {
            document.getElementById("executive-report-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, []);

    const handleReportCardSchedule = useCallback(
        (tpl: ReportTemplate) => {
            setReportsTab("automation");
            if (tpl.type === "project_dossier" || tpl.id === "project_detail") {
                setScheduleType("project_dossier");
                setScheduleProjectId(paramProject !== "all" ? paramProject : "all");
            } else {
                setScheduleType("board_pack");
            }
            setEditingAutomation(null);
            setAutomationDrawerOpen(true);
        },
        [paramProject],
    );

    const onHistoryItemDownload = useCallback(
        (item: ReportHistoryItem) => {
            if (item.fileUrl) {
                openReportPdfUrl(item.fileUrl);
                return;
            }
            push(tr("toastNoDownloadLink"), "error");
        },
        [push, tr],
    );

    const onHistoryItemRegenerate = useCallback(
        (item: ReportHistoryItem) => {
            onServerRegenerate(historyItemToN8n(item));
        },
        [onServerRegenerate],
    );

    const onHistoryItemResend = useCallback(
        (item: ReportHistoryItem) => {
            if (!enterpriseId) {
                push(tr("toastEmailNeedEnterprise"), "error");
                return;
            }
            setEmailReportId(item.reportId);
            setReportsTab("automation");
        },
        [enterpriseId, push, tr],
    );

    const onHistoryItemDelete = useCallback(
        async (item: ReportHistoryItem) => {
            if (!enterpriseId) {
                push(tr("serverNoEnterpriseBody"), "error");
                return;
            }
            if (!window.confirm("Supprimer ce rapport ?")) return;

            setDeletingReportId(item.reportId);
            try {
                const data = await reportsN8n.deleteReportMutation.mutateAsync(item.reportId);
                if (data.success) {
                    if (emailReportId === item.reportId) setEmailReportId("");
                    push("Rapport supprimé", "success");
                } else {
                    push(data.message ?? "Erreur lors de la suppression", "error");
                }
            } catch (err) {
                console.error("Delete report error:", err);
                push("Erreur réseau lors de la suppression", "error");
            } finally {
                setDeletingReportId(null);
            }
        },
        [enterpriseId, reportsN8n.deleteReportMutation, emailReportId, push, tr],
    );

    const onSendReportEmail = useCallback(() => {
        if (!enterpriseId) {
            push(tr("toastEmailNeedEnterprise"), "error");
            return;
        }
        if (!emailReportId.trim()) {
            push(tr("toastEmailPickReport"), "error");
            return;
        }
        const selected = reportsWithPdfForEmail.find((r) => r.reportId === emailReportId.trim());
        if (!selected?.fileUrl?.trim()) {
            push(tr("toastEmailPickUrl"), "error");
            return;
        }
        const rec = parseRecipients(emailRecipients);
        if (!rec.length) {
            push(tr("toastEmailNeedRecipients"), "error");
            return;
        }
        reportsN8n.sendEmailMutation.mutate(
            {
                enterprise_id: enterpriseId,
                report_id: emailReportId.trim(),
                recipients: rec,
                subject: emailSubject.trim() || tr("emailFallbackSubject"),
                message: emailMessage.trim() || tr("emailFallbackBody"),
            },
            {
                onSuccess: () => push(tr("toastEmailSent", { count: rec.length }), "success"),
                onError: (err) => push(axiosErrorMessage(err, tr("toastEmailFail")), "error"),
            },
        );
    }, [enterpriseId, emailReportId, emailRecipients, emailSubject, emailMessage, reportsN8n.sendEmailMutation, reportsWithPdfForEmail, push, tr]);

    const onScheduleReport = useCallback(() => {
        if (!enterpriseId) {
            push(tr("toastScheduleNeedEnterprise"), "error");
            return;
        }
        const rec = parseRecipients(scheduleRecipients);
        if (!rec.length) {
            push(tr("toastScheduleNeedRecipients"), "error");
            return;
        }
        if (scheduleType === "project_dossier" && scheduleProjectId === "all") {
            push(tr("toastScheduleNeedProject"), "error");
            return;
        }
        const payload: ScheduleReportPayload = {
            enterprise_id: enterpriseId,
            report_type: scheduleType,
            frequency: scheduleFreq,
            recipients: rec,
            language: scheduleLang,
        };
        if (scheduleType === "project_dossier") payload.project_id = scheduleProjectId;
        reportsN8n.scheduleMutation.mutate(payload, {
            onSuccess: () => push(tr("toastScheduleOk"), "success"),
            onError: (err) => push(axiosErrorMessage(err, tr("toastScheduleFail")), "error"),
        });
    }, [
        enterpriseId,
        scheduleRecipients,
        scheduleType,
        scheduleFreq,
        scheduleLang,
        scheduleProjectId,
        reportsN8n.scheduleMutation,
        push,
        tr,
    ]);

    const toggleFavorite = useCallback((templateId: string) => {
        setFavorites((prev) => {
            const next = new Set(prev);
            if (next.has(templateId)) next.delete(templateId);
            else next.add(templateId);
            saveFavorites(next);
            return next;
        });
    }, []);

    const handleCardFormatSelect = useCallback((fmt: ReportFormat) => {
        if (fmt === "pdf") setExportFormat("pdf");
        else if (fmt === "excel") setExportFormat("xlsx");
        else setExportFormat("csv");
    }, []);

    const filteredTemplates = useMemo(
        () => enrichedTemplates.filter((tpl) => templateMatchesAudience(tpl.id, audienceFilter)),
        [enrichedTemplates, audienceFilter],
    );

    const tabCounts = useMemo(
        () => ({
            generation: 0,
            history: historyDisplay.length,
            automation: automations.filter((s) => s.active).length,
        }),
        [historyDisplay.length, automations],
    );

    const automationKpis = useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const monthReports = historyDisplay.filter((r) => {
            const t = new Date(r.generatedAt).getTime();
            return Number.isFinite(t) && t >= monthStart;
        });
        const ready = monthReports.filter((r) => r.status === "ready").length;
        const total = monthReports.length;
        const successRate = total ? Math.round((ready / total) * 100) : null;
        const latest = historyDisplay.find((r) => r.generatedAt) ?? null;
        let lastSentLabel = "Aucun envoi";
        if (latest?.generatedAt) {
            const t = new Date(latest.generatedAt).getTime();
            if (Number.isFinite(t)) {
                const diffH = Math.floor((Date.now() - t) / 3600000);
                lastSentLabel =
                    diffH < 1 ? "il y a moins d'1 h" : diffH < 24 ? `il y a ${diffH} h` : `il y a ${Math.floor(diffH / 24)} j`;
            }
        }
        return { sentThisMonth: monthReports.length, successRate, lastSentLabel };
    }, [historyDisplay]);

    const historySparkline = useMemo(() => {
        const days = 7;
        const now = Date.now();
        const dayMs = 86400000;
        return Array.from({ length: days }, (_, i) => {
            const start = now - (days - i) * dayMs;
            const end = start + dayMs;
            return historyDisplay.filter((r) => {
                const t = new Date(r.generatedAt).getTime();
                return Number.isFinite(t) && t >= start && t < end;
            }).length;
        });
    }, [historyDisplay]);

    const weeklyReportCount = useMemo(() => {
        const weekAgo = Date.now() - 7 * 86400000;
        return historyDisplay.filter((r) => new Date(r.generatedAt).getTime() >= weekAgo).length;
    }, [historyDisplay]);

    const healthLabel = data.health?.score != null ? `${data.health.score.toFixed(1)}/10` : "—";

    const selectedTemplateTitle =
        templateDefs.find((x) => x.id === selectedTemplate)?.title ?? tr("previewDefaultReportTitle");

    const templateTitleFromKey = useCallback((key: ReportAutomation["templateKey"]) => {
        const map: Record<ReportAutomation["templateKey"], string> = {
            board_pack: tr("templateBoardPackTitle"),
            global_enterprise: tr("templateGlobalTitle"),
            project_dossier: tr("templateProjectTitle"),
            hr_talents: tr("templateRhTitle"),
            risks_alerts: tr("templateRisksTitle"),
            decisions_ai: tr("templateDecisionsTitle"),
        };
        return map[key] ?? key;
    }, [tr]);

    const audienceLabelFromKey = useCallback((aud: Exclude<ReportAudience, "all">) => {
        const map: Record<Exclude<ReportAudience, "all">, string> = {
            direction: "Direction",
            rh: "RH",
            project: "Projet",
            risks: "Risques",
        };
        return map[aud];
    }, []);

    const buildAutomationFromDrawer = useCallback(
        (values: AutomationDrawerValues, id: string): ReportAutomation => {
            const auto: ReportAutomation = {
                id,
                title: templateTitleFromKey(values.templateKey),
                templateKey: values.templateKey,
                audience: values.audience,
                audienceLabel: audienceLabelFromKey(values.audience),
                recipients: parseRecipients(values.recipients),
                frequency: values.frequency,
                dayOfWeek: values.frequency === "weekly" ? Number(values.dayOfWeek) : undefined,
                dayOfMonth: values.frequency === "monthly" ? Number(values.dayOfMonth) : undefined,
                time: values.time,
                language: values.language,
                format: values.format,
                active: true,
                lastSentLabel: "—",
                nextSentLabel: frequencyLabel({
                    id,
                    title: "",
                    templateKey: values.templateKey,
                    audience: values.audience,
                    audienceLabel: "",
                    recipients: [],
                    frequency: values.frequency,
                    dayOfWeek: Number(values.dayOfWeek),
                    dayOfMonth: Number(values.dayOfMonth),
                    time: values.time,
                    language: values.language,
                    format: values.format,
                    active: true,
                    lastSentLabel: "",
                    nextSentLabel: "",
                }),
            };
            return auto;
        },
        [audienceLabelFromKey, templateTitleFromKey],
    );

    const onAutomationDrawerSave = useCallback(
        (values: AutomationDrawerValues, editingId: string | null) => {
            const id = editingId ?? uuidv4();
            const nextItem = buildAutomationFromDrawer(values, id);
            setAutomations((prev) => {
                const next = editingId ? prev.map((a) => (a.id === editingId ? { ...nextItem, lastSentLabel: a.lastSentLabel, active: a.active } : a)) : [...prev, nextItem];
                saveAutomations(next);
                return next;
            });
            setAutomationDrawerOpen(false);
            setEditingAutomation(null);

            const apiType = mapTemplateToApiType(values.templateKey);
            const rec = parseRecipients(values.recipients);
            if (apiType && values.frequency !== "daily" && enterpriseId && rec.length) {
                const payload: ScheduleReportPayload = {
                    enterprise_id: enterpriseId,
                    report_type: apiType,
                    frequency: mapFrequencyToApi(values.frequency),
                    recipients: rec,
                    language: values.language,
                };
                if (apiType === "project_dossier" && scheduleProjectId !== "all") {
                    payload.project_id = scheduleProjectId;
                }
                reportsN8n.scheduleMutation.mutate(payload, {
                    onSuccess: () => push(tr("toastScheduleOk"), "success"),
                    onError: (err) => push(axiosErrorMessage(err, tr("toastScheduleFail")), "error"),
                });
            } else if (values.frequency === "daily") {
                push("Planification quotidienne enregistrée (envoi local).", "success");
            } else if (!rec.length) {
                push(tr("toastScheduleNeedRecipients"), "error");
            } else {
                push("Automatisation enregistrée.", "success");
            }
        },
        [
            buildAutomationFromDrawer,
            enterpriseId,
            scheduleProjectId,
            reportsN8n.scheduleMutation,
            push,
            tr,
        ],
    );

    const onHistoryPreview = useCallback(
        (item: ReportHistoryItem) => {
            if (item.fileUrl) openReportPdfUrl(item.fileUrl);
            else push(tr("toastNoDownloadLink"), "error");
        },
        [push, tr],
    );

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={tr("shellTitle")}
            description={false}
            omitHeader
        >
            <div className="space-y-6 lg:space-y-8 print:space-y-4">
                <ReportsHeader title={tr("shellTitle")} subtitle={tr("pageHeroSubtitle")} />
                <ReportsTabs active={reportsTab} counts={tabCounts} onChange={setReportsTab} />

                {isError ? (
                    <div
                        className="flex items-start gap-3 rounded-xl border border-utility-warning-200 bg-utility-warning-50 px-4 py-3 text-sm text-utility-warning-900 dark:border-utility-warning-900/40 dark:bg-utility-warning-950/30 dark:text-utility-warning-100"
                        role="status"
                    >
                        <span className="mt-0.5 inline-flex size-2 shrink-0 rounded-full bg-utility-warning-500" aria-hidden />
                        <span>{tr("loadPartialData")}</span>
                    </div>
                ) : null}

                {reportsTab === "generation" && isLoading ? (
                    <div
                        className="space-y-4 rounded-2xl border border-secondary bg-primary p-6 shadow-sm"
                        aria-busy="true"
                        id="reports-tab-panel-generation"
                        role="tabpanel"
                        aria-labelledby="reports-tab-trigger-generation"
                    >
                        <div className="h-4 w-48 animate-pulse rounded-md bg-secondary_subtle" />
                        <div className="h-24 animate-pulse rounded-xl bg-secondary_subtle" />
                        <div className="h-40 animate-pulse rounded-xl bg-secondary_subtle" />
                        <p className="text-center text-sm text-tertiary">{tr("loadDashboardData")}</p>
                    </div>
                ) : null}

                {reportsTab === "generation" && !isLoading ? (
                    <div
                        className="space-y-8 pb-28 print:space-y-6 xl:pb-0"
                        id="reports-tab-panel-generation"
                        role="tabpanel"
                        aria-labelledby="reports-tab-trigger-generation"
                    >
                        <QuickActionsBar
                            onBoardPack={runBoardPack}
                            onProjectPdf={runProjectDossier}
                            onExportCsv={exportDecisions}
                            onPrint={onPrint}
                            onDownloadLastPdf={
                                lastGenerated?.file_url ? () => openReportPdfUrl(lastGenerated.file_url!) : undefined
                            }
                            boardPackBusy={boardPackBusy}
                            dossierBusy={dossierBusy}
                            boardPackDisabled={!enterpriseId}
                            projectPdfDisabled={!enterpriseId || paramProject === "all"}
                            exportDisabled={isLoading}
                            hasLastPdf={Boolean(lastGenerated?.file_url)}
                        />
                        {/* legacy-actions-hidden */}
                        <section className="hidden rounded-2xl border border-secondary bg-primary p-4 shadow-sm lg:p-5 print:hidden">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-primary">{tr("actionsQuickTitle")}</h2>
                                    <p className="mt-1 text-xs text-tertiary">{tr("actionsQuickSubtitle")}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={!enterpriseId || boardPackBusy}
                                        title={!enterpriseId ? tr("enterpriseIdRequiredTitle") : undefined}
                                        onClick={runBoardPack}
                                        className="rounded-xl border border-brand-solid bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-solid_hover disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {boardPackBusy ? tr("busyGenerating") : tr("generateBoardPack")}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!enterpriseId || paramProject === "all" || dossierBusy}
                                        title={
                                            paramProject === "all"
                                                ? tr("selectProjectTitle")
                                                : !enterpriseId
                                                  ? tr("enterpriseRequiredShort")
                                                  : undefined
                                        }
                                        onClick={runProjectDossier}
                                        className="rounded-xl border border-secondary bg-primary_alt px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {dossierBusy ? tr("busyGenerating") : tr("generateProjectPdf")}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isLoading}
                                        onClick={exportDecisions}
                                        className="rounded-xl border border-secondary px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-secondary_subtle disabled:opacity-50"
                                    >
                                        {tr("exportCsvButton")}
                                    </button>
                                    {lastGenerated?.file_url ? (
                                        <button
                                            type="button"
                                            onClick={() => openReportPdfUrl(lastGenerated.file_url!)}
                                            className="rounded-xl border border-emerald-600/50 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-100"
                                        >
                                            {tr("downloadPdf")}
                                        </button>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={onPrint}
                                        className="rounded-xl border border-dashed border-secondary px-4 py-2.5 text-sm font-semibold text-tertiary hover:border-brand-secondary/40 hover:text-brand-secondary"
                                    >
                                        {tr("printPdfButton")}
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Templates */}
                        <section className="print:hidden">
                            <h2 className="text-sm font-semibold text-primary">{tr("templatesSectionTitle")}</h2>
                            <p className="mt-1 text-xs text-tertiary">{tr("templatesSectionSubtitle")}</p>
                            <div className="mt-4 grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_360px]">
                                <div>
                                    <ReportsQuickFilters value={audienceFilter} onChange={setAudienceFilter} />
                                    <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                                    {filteredTemplates.map((tpl) => (
                                        <ReportTemplateCard
                                            key={tpl.id}
                                            template={tpl}
                                            onGenerate={handleReportCardGenerate}
                                            onPreview={handleReportCardPreview}
                                            onSchedule={handleReportCardSchedule}
                                            onFormatSelect={handleCardFormatSelect}
                                            isFavorite={favorites.has(tpl.id)}
                                            onToggleFavorite={() => toggleFavorite(tpl.id)}
                                            loading={generatingTemplateId === tpl.id && (boardPackBusy || dossierBusy)}
                                        />
                                    ))}
                                    </div>
                                </div>
                                <aside className="hidden xl:block">
                                    <div className="sticky top-24 xl:top-28">
                                        <ReportPreviewPanel
                                            variant="embedded"
                                            templateTitle={selectedTemplateTitle}
                                            sections={previewStats.sections}
                                            pageEst={previewStats.pageEst}
                                            projectsIncluded={Number(previewStats.projectsIncluded)}
                                            decisionsCount={previewStats.decisionsCount}
                                            alertsCount={previewStats.alertsCount}
                                            talents={previewStats.talents}
                                            healthLabel={healthLabel}
                                            volumeBars={volumeBars}
                                            aiBullets={aiBullets}
                                            includeCharts={includeCharts}
                                            includeAi={includeAi}
                                            dataReady={previewDataReady}
                                            generating={boardPackBusy || dossierBusy}
                                            generateDisabled={!enterpriseId}
                                            onGenerate={() => {
                                                const tpl = enrichedTemplates.find((t) => t.id === selectedTemplate);
                                                if (tpl) handleReportCardGenerate(tpl);
                                            }}
                                        />
                                    </div>
                                </aside>
                            </div>
                            <ReportPreviewPanel
                                variant="mobileBar"
                                templateTitle={selectedTemplateTitle}
                                sections={previewStats.sections}
                                pageEst={previewStats.pageEst}
                                projectsIncluded={Number(previewStats.projectsIncluded)}
                                decisionsCount={previewStats.decisionsCount}
                                alertsCount={previewStats.alertsCount}
                                talents={previewStats.talents}
                                healthLabel={healthLabel}
                                volumeBars={volumeBars}
                                aiBullets={aiBullets}
                                includeCharts={includeCharts}
                                includeAi={includeAi}
                                dataReady={previewDataReady}
                                generating={boardPackBusy || dossierBusy}
                                generateDisabled={!enterpriseId}
                                onGenerate={() => {
                                    const tpl = enrichedTemplates.find((t) => t.id === selectedTemplate);
                                    if (tpl) handleReportCardGenerate(tpl);
                                }}
                                mobileOpen={mobilePreviewOpen}
                                onMobileOpenChange={setMobilePreviewOpen}
                            />
                        </section>

                        <section className="mt-8 space-y-6 print:hidden">
                        <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm lg:p-5">
                                <h2 className="text-sm font-semibold text-primary">{tr("advancedParamsTitle")}</h2>
                                <div className="mt-4 grid gap-3 text-sm">
                                    <label className="grid gap-1">
                                        <span className="text-xs font-medium text-tertiary">{tr("periodLabel")}</span>
                                        <select
                                            value={range}
                                            onChange={(e) => setRange(e.target.value as ReportRange)}
                                            className="rounded-lg border border-secondary bg-primary px-3 py-2"
                                        >
                                            <option value="7d">{tr("range7d")}</option>
                                            <option value="30d">{tr("range30d")}</option>
                                            <option value="90d">{tr("range90d")}</option>
                                        </select>
                                    </label>
                                    <label className="grid gap-1">
                                        <span className="text-xs font-medium text-tertiary">{tr("projectFocusLabel")}</span>
                                        <select
                                            value={paramProject}
                                            onChange={(e) => setParamProject(e.target.value)}
                                            className="rounded-lg border border-secondary bg-primary px-3 py-2"
                                        >
                                            <option value="all">{tr("allProjectsOption")}</option>
                                            {projects.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="grid gap-1">
                                        <span className="text-xs font-medium text-tertiary">{tr("targetFormatLabel")}</span>
                                        <select
                                            value={exportFormat}
                                            onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                                            className="rounded-lg border border-secondary bg-primary px-3 py-2"
                                        >
                                            <option value="csv">{tr("formatCsvOption")}</option>
                                            <option value="pdf">{tr("formatPdfOption")}</option>
                                            <option value="xlsx">{tr("formatXlsxOption")}</option>
                                        </select>
                                        {exportFormat === "xlsx" ? (
                                            <span className="text-[11px] text-amber-700 dark:text-amber-200">{tr("xlsxSoonHint")}</span>
                                        ) : null}
                                        {exportFormat === "pdf" ? (
                                            <span className="text-[11px] text-tertiary">{tr("pdfServerHint")}</span>
                                        ) : null}
                                    </label>
                                    <label className="grid gap-1">
                                        <span className="text-xs font-medium text-tertiary">{tr("languageLabel")}</span>
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value as "fr" | "en")}
                                            className="rounded-lg border border-secondary bg-primary px-3 py-2"
                                        >
                                            <option value="fr">{tr("langFrOption")}</option>
                                            <option value="en">{tr("langEnOption")}</option>
                                        </select>
                                    </label>
                                    <label className="grid gap-1">
                                        <span className="text-xs font-medium text-tertiary">{tr("detailLevelLabel")}</span>
                                        <select
                                            value={detailLevel}
                                            onChange={(e) => setDetailLevel(e.target.value as DetailLevel)}
                                            className="rounded-lg border border-secondary bg-primary px-3 py-2"
                                        >
                                            <option value="summary">{tr("detailSummary")}</option>
                                            <option value="standard">{tr("detailStandard")}</option>
                                            <option value="full">{tr("detailFull")}</option>
                                        </select>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" checked={includeCharts} onChange={(e) => setIncludeCharts(e.target.checked)} className="rounded border-secondary" />
                                        {tr("includeChartsLabel")}
                                    </label>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" checked={includeAi} onChange={(e) => setIncludeAi(e.target.checked)} className="rounded border-secondary" />
                                        {tr("includeAiLabel")}
                                    </label>
                                </div>
                            </section>

                            {/* legacy preview removed */}
                            <section className="hidden" aria-hidden id="executive-report-preview-legacy-deleted">
                                <h2 className="text-sm font-semibold text-primary">{tr("previewReportTitle")}</h2>
                                <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-secondary bg-gradient-to-br from-primary to-brand-primary_alt/10 p-4">
                                    <div className="rounded-lg border border-secondary bg-primary px-4 py-6 shadow-inner">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-tertiary">{tr("confidentialReport")}</p>
                                        <p className="mt-2 text-lg font-bold text-primary">
                                            {templateDefs.find((x) => x.id === selectedTemplate)?.title ?? tr("previewDefaultReportTitle")}
                                        </p>
                                        <p className="mt-1 text-xs text-secondary">
                                            {rangeLabel(range)} ·{" "}
                                            {new Date().toLocaleDateString(i18n.language === "ar" ? "ar" : i18n.language === "en" ? "en-GB" : "fr-FR")}
                                        </p>
                                        <div className="mt-4 h-px bg-secondary" />
                                        <p className="mt-3 text-[11px] font-semibold uppercase text-tertiary">{tr("plannedSectionsTitle")}</p>
                                        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-secondary">
                                            {previewStats.sections.map((s) => (
                                                <li key={s}>{s}</li>
                                            ))}
                                        </ul>
                                        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                                            <div className="rounded-lg border border-secondary bg-primary_alt px-2 py-2">
                                                <dt className="text-tertiary">{tr("pagesEstimateLabel")}</dt>
                                                <dd className="font-semibold tabular-nums text-primary">{previewStats.pageEst}</dd>
                                            </div>
                                            <div className="rounded-lg border border-secondary bg-primary_alt px-2 py-2">
                                                <dt className="text-tertiary">{tr("projectsLabelKpi")}</dt>
                                                <dd className="font-semibold tabular-nums text-primary">{previewStats.projectsIncluded}</dd>
                                            </div>
                                            <div className="rounded-lg border border-secondary bg-primary_alt px-2 py-2">
                                                <dt className="text-tertiary">{tr("decisionsLabelKpi")}</dt>
                                                <dd className="font-semibold tabular-nums text-primary">{previewStats.decisionsCount}</dd>
                                            </div>
                                            <div className="rounded-lg border border-secondary bg-primary_alt px-2 py-2">
                                                <dt className="text-tertiary">{tr("alertsLabelKpi")}</dt>
                                                <dd className="font-semibold tabular-nums text-primary">{previewStats.alertsCount}</dd>
                                            </div>
                                            <div className="rounded-lg border border-secondary bg-primary_alt px-2 py-2">
                                                <dt className="text-tertiary">{tr("talentsLabelKpi")}</dt>
                                                <dd className="font-semibold tabular-nums text-primary">{previewStats.talents}</dd>
                                            </div>
                                            <div className="rounded-lg border border-secondary bg-primary_alt px-2 py-2">
                                                <dt className="text-tertiary">{tr("healthLabelKpi")}</dt>
                                                <dd className="font-semibold tabular-nums text-primary">{data.health?.score != null ? `${data.health.score.toFixed(1)}/10` : "—"}</dd>
                                            </div>
                                        </dl>
                                        {includeCharts ? (
                                            <div className="mt-4">
                                                <p className="text-[11px] font-semibold uppercase text-tertiary">{tr("volumeDecisionsTitle")}</p>
                                                <div className="mt-2 flex h-16 items-end gap-1">
                                                    {volumeBars.map((b) => (
                                                        <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                                                            <div
                                                                className="w-full max-w-[2rem] rounded-t bg-brand-secondary/70"
                                                                style={{ height: `${Math.max(8, b.hPct)}%` }}
                                                                title={`${b.label}: ${b.count}`}
                                                            />
                                                            <span className="hidden text-[9px] text-tertiary sm:inline">{b.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                        {includeAi && aiBullets.length ? (
                                            <div className="mt-4 rounded-lg border border-brand-secondary/20 bg-brand-primary/5 p-3">
                                                <p className="text-[11px] font-semibold uppercase text-brand-secondary">{tr("recosTitle")}</p>
                                                <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] leading-relaxed text-secondary">
                                                    {aiBullets.map((b, i) => (
                                                        <li key={i}>{b}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </section>

                        {/* Project dossier PDF */}
                        <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm lg:p-5">
                            <h2 className="text-sm font-semibold text-primary">{tr("projectDossierTitle")}</h2>
                            <p className="mt-1 text-xs text-tertiary">{tr("projectDossierDesc")}</p>
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                                <label className="grid min-w-[12rem] flex-1 gap-1 text-sm">
                                    <span className="text-xs font-medium text-tertiary">{tr("projectSelectLabel")}</span>
                                    <select
                                        value={paramProject}
                                        onChange={(e) => setParamProject(e.target.value)}
                                        className="rounded-lg border border-secondary bg-primary px-3 py-2"
                                    >
                                        <option value="all">{tr("selectProjectPlaceholder")}</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <button
                                    type="button"
                                    onClick={runProjectDossier}
                                    disabled={!enterpriseId || paramProject === "all" || dossierBusy}
                                    className="rounded-xl border border-secondary bg-primary_alt px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {dossierBusy ? tr("busyGenerating") : tr("generateProjectPdf")}
                                </button>
                                <button
                                    type="button"
                                    onClick={exportProject}
                                    disabled={paramProject === "all"}
                                    className="rounded-xl border border-brand-secondary/40 bg-brand-primary/10 px-4 py-2.5 text-sm font-semibold text-brand-secondary hover:bg-brand-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {tr("exportProjectCsvBtn")}
                                </button>
                            </div>
                            {!enterpriseId ? (
                                <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{tr("enterpriseIdRequiredPdf")}</p>
                            ) : null}
                        </section>
                        </section>
                    </div>
                ) : null}

                {reportsTab === "history" ? (
                    <div
                        className="space-y-8 print:space-y-4"
                        id="reports-tab-panel-history"
                        role="tabpanel"
                        aria-labelledby="reports-tab-trigger-history"
                    >
                        <header className="print:hidden">
                            <h2 className="text-lg font-bold tracking-tight text-primary">{tr("historyTitle")}</h2>
                            <p className="mt-1 max-w-2xl text-sm text-secondary">{tr("historyIntro")}</p>
                        </header>

                        {!enterpriseId ? (
                            <section className="rounded-2xl border border-dashed border-secondary bg-gradient-to-br from-primary_alt/40 to-primary px-6 py-12 text-center">
                                <h3 className="text-base font-semibold text-primary">{tr("serverReportsTitle")}</h3>
                                <p className="mx-auto mt-3 max-w-md text-sm text-secondary">{tr("serverNoEnterpriseBody")}</p>
                            </section>
                        ) : reportsN8n.historyQuery.isError ? (
                            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
                                <span className="mt-1 inline-flex size-2 shrink-0 rounded-full bg-red-500" aria-hidden />
                                <div>
                                    <p className="font-semibold">{tr("serverLoadErrorTitle")}</p>
                                    <p className="mt-1 text-xs opacity-90">
                                        {reportsN8n.historyQuery.error instanceof Error
                                            ? reportsN8n.historyQuery.error.message
                                            : String(reportsN8n.historyQuery.error)}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <ReportsHistoryTimeline
                                reports={historyDisplay}
                                allReports={historyAll}
                                loading={Boolean(
                                    enterpriseId &&
                                        (reportsN8n.historyQuery.isLoading || reportsN8n.historyQuery.isFetching),
                                )}
                                sparkline={historySparkline}
                                weeklyCount={weeklyReportCount}
                                onDownload={onHistoryItemDownload}
                                onPreview={onHistoryPreview}
                                onShare={onHistoryItemResend}
                                onRegenerate={onHistoryItemRegenerate}
                                onDelete={onHistoryItemDelete}
                                deletingReportId={deletingReportId}
                                onGenerateFirst={() => setReportsTab("generation")}
                            />
                        )}

                        <LocalCsvExportsTable
                            title={tr("localExportsTableTitle")}
                            rows={history}
                            onDownload={downloadAgain}
                            onRegenerate={regenerate}
                        />
                    </div>
                ) : null}

                {reportsTab === "automation" ? (
                    <div
                        className="space-y-8 print:hidden"
                        id="reports-tab-panel-automation"
                        role="tabpanel"
                        aria-labelledby="reports-tab-trigger-automation"
                    >
                        <header className="mb-2">
                            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">{tr("automationTitle")}</h2>
                            <p className="mt-1 max-w-2xl text-sm text-slate-500">{tr("automationIntro")}</p>
                        </header>

                        <ReportsAutomationSection
                            automations={automations}
                            activeCount={automations.filter((a) => a.active).length}
                            sentThisMonth={automationKpis.sentThisMonth}
                            successRate={automationKpis.successRate}
                            lastSentLabel={automationKpis.lastSentLabel}
                            onNewAutomation={() => {
                                setEditingAutomation(null);
                                setAutomationDrawerOpen(true);
                            }}
                            onToggle={(id, active) =>
                                setAutomations((prev) => {
                                    const next = prev.map((a) => (a.id === id ? { ...a, active } : a));
                                    saveAutomations(next);
                                    return next;
                                })
                            }
                            onEdit={(a) => {
                                setEditingAutomation(a);
                                setAutomationDrawerOpen(true);
                            }}
                            onDelete={(id) =>
                                setAutomations((prev) => {
                                    const next = prev.filter((a) => a.id !== id);
                                    saveAutomations(next);
                                    return next;
                                })
                            }
                            emptyPdfHint={
                                enterpriseId &&
                                reportsWithPdfForEmail.length === 0 &&
                                !reportsN8n.historyQuery.isLoading &&
                                !reportsN8n.historyQuery.isFetching ? (
                                    <div className="rounded-3xl border border-dashed border-indigo-200/60 bg-indigo-50/30 px-5 py-4 text-sm text-slate-600 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                                        <p className="font-medium text-slate-900 dark:text-slate-100">{tr("automationEmpty1")}</p>
                                        <p className="mt-2 text-xs text-slate-500">{tr("automationEmpty2")}</p>
                                    </div>
                                ) : null
                            }
                            emailSection={
                            <>
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="grid gap-1 text-sm">
                                    <span className="text-xs font-medium text-tertiary">{tr("emailGeneratedReport")}</span>
                                    <select
                                        value={emailReportId}
                                        onChange={(e) => setEmailReportId(e.target.value)}
                                        disabled={!reportsWithPdfForEmail.length}
                                        className="rounded-lg border border-secondary bg-primary px-3 py-2 disabled:opacity-50"
                                    >
                                        <option value="">
                                            {reportsWithPdfForEmail.length ? tr("emailPickPlaceholder") : tr("emailNoPdfOption")}
                                        </option>
                                        {reportsWithPdfForEmail.map((r) => (
                                            <option key={r.reportId} value={r.reportId}>
                                                {formatReportSelectLabelFromItem(r, i18n.language)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="grid gap-1 text-sm md:col-span-2">
                                    <span className="text-xs font-medium text-tertiary">{tr("emailRecipientsLabel")}</span>
                                    <input
                                        type="text"
                                        value={emailRecipients}
                                        onChange={(e) => setEmailRecipients(e.target.value)}
                                        placeholder={tr("emailRecipientsPh")}
                                        className="rounded-lg border border-secondary bg-primary px-3 py-2"
                                    />
                                </label>
                                <label className="grid gap-1 text-sm">
                                    <span className="text-xs font-medium text-tertiary">{tr("emailSubjectLabel")}</span>
                                    <input
                                        type="text"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                        className="rounded-lg border border-secondary bg-primary px-3 py-2"
                                    />
                                </label>
                                <label className="grid gap-1 text-sm md:col-span-2">
                                    <span className="text-xs font-medium text-tertiary">{tr("emailMessageLabel")}</span>
                                    <textarea
                                        value={emailMessage}
                                        onChange={(e) => setEmailMessage(e.target.value)}
                                        rows={3}
                                        className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                                    />
                                </label>
                            </div>
                            <button
                                type="button"
                                disabled={
                                    !enterpriseId ||
                                    !emailReportId ||
                                    !reportsWithPdfForEmail.length ||
                                    reportsN8n.sendEmailMutation.isPending
                                }
                                onClick={onSendReportEmail}
                                className="mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {reportsN8n.sendEmailMutation.isPending ? tr("sendPending") : tr("sendButton")}
                            </button>
                            </>
                            }
                        />

                        <ReportsAutomationDrawer
                            open={automationDrawerOpen}
                            editing={editingAutomation}
                            onClose={() => {
                                setAutomationDrawerOpen(false);
                                setEditingAutomation(null);
                            }}
                            onSave={onAutomationDrawerSave}
                            saving={reportsN8n.scheduleMutation.isPending}
                        />
                    </div>
                ) : null}

            </div>
        </WorkspacePageShell>
    );
}

function ReportStatusPill({ status }: { status: "ready" | "error" | "pending" }) {
    const { t } = useTranslation("common");
    const label =
        status === "error"
            ? t("managerWorkspace.reportsPage.statusError")
            : status === "pending"
              ? t("managerWorkspace.reportsPage.statusPending")
              : t("managerWorkspace.reportsPage.statusReady");
    const cls =
        status === "error"
            ? "bg-red-50 text-red-900 ring-red-100 dark:bg-red-950/50 dark:text-red-100 dark:ring-red-900/60"
            : status === "pending"
              ? "bg-amber-50 text-amber-900 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900/60"
              : "bg-emerald-50 text-emerald-900 ring-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-100 dark:ring-emerald-900/50";
    return (
        <span
            className={cx(
                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                cls,
            )}
        >
            {label}
        </span>
    );
}

function localExportUiStatus(status: ReportHistoryRow["status"]): "ready" | "error" | "pending" {
    if (status === "En attente backend") return "pending";
    return "ready";
}

function LocalCsvExportsTable({
    title,
    rows,
    onDownload,
    onRegenerate,
}: {
    title: string;
    rows: ReportHistoryRow[];
    onDownload: (r: ReportHistoryRow) => void;
    onRegenerate: (r: ReportHistoryRow) => void;
}) {
    const { t, i18n } = useTranslation("common");
    const tr = (key: string) => t(`managerWorkspace.reportsPage.${key}`);
    const dateLocale = i18n.language === "ar" ? "ar" : i18n.language === "en" ? "en-GB" : "fr-FR";

    if (!rows.length) {
        return (
            <section className="rounded-2xl border border-dashed border-secondary bg-gradient-to-br from-primary_alt/50 to-primary px-6 py-12 text-center">
                <h3 className="text-base font-semibold text-primary">{title}</h3>
                <p className="mx-auto mt-3 max-w-md text-sm text-secondary">{tr("localExportsEmptyBody")}</p>
            </section>
        );
    }

    return (
        <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm ring-1 ring-secondary/30">
            <div>
                <h3 className="text-sm font-semibold text-primary">{title}</h3>
                <p className="mt-0.5 text-xs text-tertiary">{tr("localExportsStoredNote")}</p>
            </div>
            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                        <tr className="border-b border-secondary text-xs uppercase text-tertiary">
                            <th className="py-2 pr-2 font-medium">{tr("thName")}</th>
                            <th className="py-2 pr-2 font-medium">{tr("thType")}</th>
                            <th className="py-2 pr-2 font-medium">{tr("thDate")}</th>
                            <th className="py-2 pr-2 font-medium">{tr("thStatus")}</th>
                            <th className="py-2 pr-2 font-medium">{tr("thSize")}</th>
                            <th className="py-2 text-right font-medium">{tr("thActions")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id} className="border-b border-secondary last:border-0">
                                <td className="max-w-[200px] truncate py-2 pr-2 font-medium text-primary">{r.name}</td>
                                <td className="py-2 pr-2 text-secondary">{r.type}</td>
                                <td className="py-2 pr-2 text-xs text-tertiary">{new Date(r.createdAt).toLocaleString(dateLocale)}</td>
                                <td className="py-2 pr-2">
                                    <ReportStatusPill status={localExportUiStatus(r.status)} />
                                </td>
                                <td className="py-2 pr-2 text-xs tabular-nums text-tertiary">{r.sizeLabel ?? "—"}</td>
                                <td className="py-2 text-right">
                                    <button type="button" className="text-xs font-medium text-brand-secondary hover:underline" onClick={() => onDownload(r)}>
                                        {tr("downloadButton")}
                                    </button>
                                    <span className="mx-1 text-tertiary">·</span>
                                    <button type="button" className="text-xs font-medium text-brand-secondary hover:underline" onClick={() => onRegenerate(r)}>
                                        {tr("regenerateButton")}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
