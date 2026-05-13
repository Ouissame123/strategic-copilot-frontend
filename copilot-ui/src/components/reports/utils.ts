/**
 * Utilitaires partagés pour les composants Reports.
 */
import type { ReportFormat, ReportType, ServiceStatus, DecisionLabel } from "./types";

export function formatRelativeDate(iso?: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    if (diffH < 24) return `il y a ${diffH} h`;
    if (diffD < 7) return `il y a ${diffD} j`;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(iso?: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatBytes(bytes?: number | null): string {
    if (bytes == null || !Number.isFinite(bytes)) return "—";
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1_048_576).toFixed(1)} Mo`;
}

const REPORT_TYPE_LABEL: Record<ReportType, string> = {
    board_pack: "Pack comité",
    project_dossier: "Dossier projet",
    global_enterprise: "Rapport global",
    hr_talents: "RH & talents",
    risks_alerts: "Risques & alertes",
    decisions_ai: "Décisions IA",
};

export function labelReportType(t: ReportType): string {
    return REPORT_TYPE_LABEL[t] || t;
}

const FORMAT_LABEL: Record<ReportFormat, string> = {
    pdf: "PDF",
    csv: "CSV",
    excel: "Excel",
    print: "Imprimer",
};

export function labelFormat(f: ReportFormat): string {
    return FORMAT_LABEL[f] || f.toUpperCase();
}

export const STATUS_COLOR: Record<ServiceStatus, { dot: string; text: string; bg: string }> = {
    ok: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
    degraded: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
    down: { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
    unknown: { dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-50" },
};

export const DECISION_COLOR: Record<DecisionLabel, { fill: string; text: string; bg: string; ring: string }> = {
    Continue: { fill: "#10b981", text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" },
    Adjust: { fill: "#f59e0b", text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200" },
    Stop: { fill: "#ef4444", text: "text-rose-700", bg: "bg-rose-50", ring: "ring-rose-200" },
};

export function downloadCSV(filename: string, rows: Array<Record<string, unknown>>): void {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const esc = (v: unknown) => {
        if (v == null) return "";
        const s = String(v).replace(/"/g, '""');
        return /[",\n;]/.test(s) ? `"${s}"` : s;
    };
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function cn(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(" ");
}
