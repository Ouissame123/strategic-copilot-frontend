import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReportHistoryItem } from "@/components/reports/types";
import { cx } from "@/utils/cx";
import { ReportsEmptyState } from "./EmptyStateIllustration";
import { ReportsHistoryCard } from "./ReportsHistoryCard";
import { REPORT_CARD } from "./reports-shared";

export type HistoryQuickFilter = "all" | "mine" | "month" | "failed";

type ReportsHistoryTimelineProps = {
    /** Rapports generated + file_url (liste par défaut). */
    reports: ReportHistoryItem[];
    /** Tous les rapports normalisés (filtre Échecs). */
    allReports?: ReportHistoryItem[];
    loading?: boolean;
    sparkline: number[];
    weeklyCount: number;
    onDownload: (item: ReportHistoryItem) => void;
    onPreview?: (item: ReportHistoryItem) => void;
    onShare?: (item: ReportHistoryItem) => void;
    onRegenerate?: (item: ReportHistoryItem) => void;
    onDelete?: (item: ReportHistoryItem) => void;
    deletingReportId?: string | null;
    onGenerateFirst?: () => void;
};

export function ReportsHistoryTimeline({
    reports,
    allReports,
    loading,
    sparkline,
    weeklyCount,
    onDownload,
    onPreview,
    onShare,
    onRegenerate,
    onDelete,
    deletingReportId,
    onGenerateFirst,
}: ReportsHistoryTimelineProps) {
    const [filter, setFilter] = useState<HistoryQuickFilter>("all");

    const filtered = useMemo(() => {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const source = filter === "failed" ? (allReports ?? reports) : reports;

        return source.filter((r) => {
            if (filter === "failed") return r.status === "failed";
            if (filter === "month") {
                const t = new Date(r.generatedAt).getTime();
                if (!Number.isFinite(t) || t < monthStart.getTime()) return false;
            }
            if (filter === "mine" && r.generatedBy && r.generatedBy !== "me") return false;
            return true;
        });
    }, [reports, allReports, filter]);

    const maxSpark = Math.max(1, ...sparkline);

    if (loading) {
        return (
            <div className={REPORT_CARD + " flex items-center justify-center gap-2 p-12 text-slate-500"}>
                <Loader2 className="size-5 animate-spin" />
                Chargement de l&apos;historique…
            </div>
        );
    }

    if (!loading && reports.length === 0) {
        return (
            <ReportsEmptyState
                variant="history"
                title="Aucun rapport généré pour le moment"
                description="Vos rapports PDF serveur (statut généré avec lien de téléchargement) apparaîtront ici."
                actionLabel="Générer mon premier rapport"
                onAction={onGenerateFirst}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className={REPORT_CARD + " p-5"}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{weeklyCount}</p>
                        <p className="text-sm text-slate-500">rapports générés cette semaine</p>
                    </div>
                    <div className="flex h-12 items-end gap-1" aria-hidden>
                        {sparkline.map((v, i) => (
                            <div
                                key={i}
                                className="w-3 rounded-t bg-gradient-to-t from-indigo-600 to-violet-400"
                                style={{ height: `${Math.max(4, (v / maxSpark) * 100)}%` }}
                            />
                        ))}
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    {(
                        [
                            { id: "all" as const, label: "Tous" },
                            { id: "mine" as const, label: "Mes générations" },
                            { id: "month" as const, label: "Ce mois" },
                            { id: "failed" as const, label: "Échecs" },
                        ] as const
                    ).map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilter(f.id)}
                            className={cx(
                                "rounded-full border px-3 py-1 text-xs font-medium transition",
                                filter === f.id
                                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400",
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
                    Aucun rapport ne correspond à ce filtre.
                </p>
            ) : (
                <ul className="space-y-3" role="list">
                    {filtered.map((report) => (
                        <li key={report.reportId}>
                            <ReportsHistoryCard
                                report={report}
                                onDownload={onDownload}
                                onPreview={onPreview}
                                onShare={onShare}
                                onRegenerate={onRegenerate}
                                onDelete={onDelete}
                                deleting={deletingReportId === report.reportId}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
