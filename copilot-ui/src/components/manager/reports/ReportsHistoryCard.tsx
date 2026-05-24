import { Download, Eye, FileSpreadsheet, FileText, Loader2, RefreshCw, Trash2 } from "lucide-react";
import type { ReportHistoryItem, ReportFormat } from "@/components/reports/types";
import { formatBytes, formatDateTime, labelFormat, labelReportType } from "@/components/reports/utils";
import { cx } from "@/utils/cx";
import { REPORT_CARD } from "./reports-shared";

const FORMAT_ICON: Record<ReportFormat, typeof FileText> = {
    pdf: FileText,
    csv: FileSpreadsheet,
    excel: FileSpreadsheet,
    print: FileText,
};

export type ReportsHistoryCardProps = {
    report: ReportHistoryItem;
    onDownload: (item: ReportHistoryItem) => void;
    onPreview?: (item: ReportHistoryItem) => void;
    onShare?: (item: ReportHistoryItem) => void;
    onRegenerate?: (item: ReportHistoryItem) => void;
    onDelete?: (item: ReportHistoryItem) => void;
    deleting?: boolean;
};

export function ReportsHistoryCard({
    report,
    onDownload,
    onPreview,
    onRegenerate,
    onDelete,
    deleting,
}: ReportsHistoryCardProps) {
    const Icon = FORMAT_ICON[report.format] ?? FileText;
    const statusCls =
        report.status === "failed"
            ? "bg-rose-50 text-rose-700 ring-rose-200"
            : report.status === "generating"
              ? "bg-amber-50 text-amber-700 ring-amber-200"
              : "bg-emerald-50 text-emerald-700 ring-emerald-200";
    const statusLabel =
        report.status === "failed" ? "Échec" : report.status === "generating" ? "En cours" : "Généré";

    return (
        <article className={REPORT_CARD + " p-4 transition hover:shadow-md"}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                        <Icon className="size-5 text-indigo-600" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-50">{report.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(report.generatedAt)}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-800 ring-1 ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-200 dark:ring-indigo-900">
                                {labelReportType(report.type)}
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {labelFormat(report.format)}
                            </span>
                            <span className="text-slate-500">
                                {report.fileSize != null ? formatBytes(report.fileSize) : "—"}
                            </span>
                            <span className={cx("rounded-full px-2 py-0.5 font-semibold ring-1", statusCls)}>{statusLabel}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1 sm:shrink-0">
                    <HistoryAction icon={Download} label="Télécharger" onClick={() => onDownload(report)} disabled={deleting} />
                    {onPreview ? (
                        <HistoryAction
                            icon={Eye}
                            label="Prévisualiser"
                            onClick={() => onPreview(report)}
                            disabled={deleting}
                        />
                    ) : null}
                    {onRegenerate ? (
                        <HistoryAction
                            icon={RefreshCw}
                            label="Régénérer"
                            onClick={() => onRegenerate(report)}
                            disabled={deleting}
                        />
                    ) : null}
                    {onDelete ? (
                        <HistoryAction
                            icon={deleting ? Loader2 : Trash2}
                            label="Supprimer"
                            onClick={() => onDelete(report)}
                            disabled={deleting}
                            destructive
                            iconClassName={deleting ? "animate-spin" : undefined}
                        />
                    ) : null}
                </div>
            </div>
        </article>
    );
}

function HistoryAction({
    icon: Icon,
    label,
    onClick,
    disabled,
    destructive,
    iconClassName,
}: {
    icon: typeof Download;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
    iconClassName?: string;
}) {
    return (
        <button
            type="button"
            title={label}
            onClick={onClick}
            disabled={disabled}
            className={cx(
                "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                destructive
                    ? "border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    : "border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-400",
            )}
        >
            <Icon className={cx("size-3.5", iconClassName)} />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
