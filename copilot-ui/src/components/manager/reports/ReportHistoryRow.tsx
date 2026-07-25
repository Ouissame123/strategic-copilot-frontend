import { MoreVertical } from "lucide-react";
import type { ReportHistoryItem } from "@/components/reports/types";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { REPORT_PERIOD_LABELS, formatReportDate } from "@/components/manager/reports/reports-page-utils";
import { cx } from "@/utils/cx";

type ReportHistoryRowProps = {
    report: ReportHistoryItem;
    compact?: boolean;
    projectNameById?: Record<string, string>;
    onSend: (report: ReportHistoryItem) => void;
    onDelete: (report: ReportHistoryItem) => void;
};

export function ReportHistoryRow({ report, compact = false, projectNameById, onSend, onDelete }: ReportHistoryRowProps) {
    const isBoardPack = report.type === "board_pack";
    const projectLabel =
        report.projectName ??
        (report.projectId && projectNameById?.[report.projectId]) ??
        (report.projectId ? `Projet #${report.projectId.slice(0, 8)}` : "—");

    return (
        <li className={cx("flex items-center gap-3", compact ? "px-3 py-2" : "px-4 py-3")}>
            <span
                className={cx(
                    "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                    isBoardPack
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200"
                        : "bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-200",
                )}
            >
                {isBoardPack ? "Board pack" : "Dossier projet"}
            </span>

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {isBoardPack
                        ? `Comité — ${REPORT_PERIOD_LABELS[report.period ?? ""] ?? report.period ?? "—"}`
                        : projectLabel}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(report.language ?? "fr").toUpperCase()} · {formatReportDate(report.generatedAt)}
                </p>
            </div>

            {report.fileUrl ? (
                <a
                    href={report.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-sm font-medium text-violet-700 hover:underline dark:text-violet-300"
                >
                    Télécharger
                </a>
            ) : (
                <span className="shrink-0 text-xs text-slate-400">—</span>
            )}

            <Button type="button" color="tertiary" size="sm" onClick={() => onSend(report)}>
                Envoyer
            </Button>

            <Dropdown.Root>
                <Button
                    type="button"
                    color="tertiary"
                    size="sm"
                    className="min-h-8 min-w-8"
                    iconLeading={MoreVertical}
                    aria-label="Actions rapport"
                />
                <Dropdown.Popover className="min-w-[12rem]">
                    <Dropdown.Menu
                        onAction={(key) => {
                            const k = String(key);
                            if (k === "copy" && report.fileUrl) void navigator.clipboard.writeText(report.fileUrl);
                            if (k === "delete") onDelete(report);
                        }}
                    >
                        <Dropdown.Item id="copy" label="Copier le lien" isDisabled={!report.fileUrl} />
                        <Dropdown.Separator />
                        <Dropdown.Item id="delete" label="Supprimer" />
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
        </li>
    );
}
