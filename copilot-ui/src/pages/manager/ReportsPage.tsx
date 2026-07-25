import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ScheduleReportParams } from "@/api/manager-reports.api";
import { BoardPackCard } from "@/components/manager/reports/BoardPackCard";
import { EmailReportDialog } from "@/components/manager/reports/EmailReportDialog";
import { ProjectDossierCard } from "@/components/manager/reports/ProjectDossierCard";
import { ReportHistoryRow } from "@/components/manager/reports/ReportHistoryRow";
import { parseEmailRecipients } from "@/components/manager/reports/reports-page-utils";
import { ProjectsEmptyState } from "@/components/manager/projects/ProjectsEmptyState";
import type { ReportHistoryItem } from "@/components/reports/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { Button } from "@/components/base/buttons/button";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import {
    useCreateSchedule,
    useDeleteReport,
    useReportsEnterpriseId,
    useReportsHistory,
} from "@/hooks/use-manager-reports";
import { useProjects } from "@/hooks/useProjects";
import { cx } from "@/utils/cx";

type ReportsTabId = "generate" | "history" | "automation";
type HistoryTypeFilter = "all" | "board_pack" | "project_dossier";

const HISTORY_TYPE_FILTERS: { id: HistoryTypeFilter; label: string; tone: string }[] = [
    { id: "all", label: "Tous", tone: "slate" },
    { id: "board_pack", label: "Board pack", tone: "violet" },
    { id: "project_dossier", label: "Dossiers projet", tone: "blue" },
];

const ACTIVE_FILTER_CLASS: Record<string, string> = {
    slate: "bg-slate-100 font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100",
    violet: "bg-violet-100 font-medium text-violet-700 dark:bg-violet-950/50 dark:text-violet-200",
    blue: "bg-blue-100 font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-200",
};

function ReportsScheduleForm() {
    const [params, setParams] = useState<ScheduleReportParams>({
        report_type: "board_pack",
        project_id: "",
        frequency: "weekly",
        recipients: [],
        language: "fr",
    });
    const [recipientsRaw, setRecipientsRaw] = useState("");
    const projects = useProjects({ limit: 100 });
    const create = useCreateSchedule();

    const recipients = useMemo(() => parseEmailRecipients(recipientsRaw), [recipientsRaw]);
    const canSubmit =
        recipients.length > 0 && (params.report_type === "board_pack" || Boolean(params.project_id?.trim()));

    const submit = () => {
        create.mutate({
            ...params,
            recipients,
            project_id: params.report_type === "project_dossier" ? params.project_id?.trim() || undefined : undefined,
        });
    };

    const selectClass =
        "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

    return (
        <article className="max-w-xl rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <h3 className="mb-3 font-medium text-slate-900 dark:text-slate-100">Planifier un envoi récurrent</h3>

            <div className="space-y-3">
                <div>
                    <p className="mb-1.5 text-xs font-medium text-slate-500">Type de rapport</p>
                    <div className="flex gap-1.5">
                        {(
                            [
                                { value: "board_pack", label: "Board pack" },
                                { value: "project_dossier", label: "Dossier projet" },
                            ] as const
                        ).map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setParams((p) => ({ ...p, report_type: opt.value, project_id: "" }))}
                                className={cx(
                                    "rounded-full px-3 py-1 text-sm transition",
                                    params.report_type === opt.value
                                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {params.report_type === "project_dossier" ? (
                    <label className="grid gap-1 text-sm">
                        <span className="text-xs font-medium text-slate-500">Projet *</span>
                        <select
                            value={params.project_id ?? ""}
                            onChange={(e) => setParams((p) => ({ ...p, project_id: e.target.value }))}
                            className={selectClass}
                        >
                            <option value="">— Sélectionner —</option>
                            {(projects.data?.items ?? []).map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}

                <div>
                    <p className="mb-1.5 text-xs font-medium text-slate-500">Fréquence</p>
                    <div className="flex flex-wrap gap-1.5">
                        {(
                            [
                                { value: "weekly", label: "Hebdomadaire (lundi 8h)" },
                                { value: "monthly", label: "Mensuel (1ᵉʳ du mois 8h)" },
                            ] as const
                        ).map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setParams((p) => ({ ...p, frequency: opt.value }))}
                                className={cx(
                                    "rounded-full px-3 py-1 text-sm transition",
                                    params.frequency === opt.value
                                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <label className="grid gap-1 text-sm">
                    <span className="text-xs font-medium text-slate-500">Destinataires *</span>
                    <input
                        type="text"
                        value={recipientsRaw}
                        onChange={(e) => setRecipientsRaw(e.target.value)}
                        placeholder="email1@exemple.com, email2@exemple.com"
                        className={selectClass}
                    />
                </label>

                <label className="grid gap-1 text-sm">
                    <span className="text-xs font-medium text-slate-500">Langue</span>
                    <select
                        value={params.language}
                        onChange={(e) => setParams((p) => ({ ...p, language: e.target.value }))}
                        className={selectClass}
                    >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                    </select>
                </label>
            </div>

            <Button
                type="button"
                color="primary"
                className="mt-4"
                isDisabled={!canSubmit || create.isPending}
                isLoading={create.isPending}
                onClick={submit}
            >
                Créer la planification
            </Button>
        </article>
    );
}

export default function ReportsPage() {
    const { t } = useTranslation("common");
    const [tab, setTab] = useState<ReportsTabId>("generate");
    const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>("all");
    const [emailReport, setEmailReport] = useState<ReportHistoryItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ReportHistoryItem | null>(null);

    const enterpriseId = useReportsEnterpriseId();
    const historyQuery = useReportsHistory(50);
    const deleteReport = useDeleteReport();
    const projects = useProjects({ limit: 100 });

    const projectNameById = useMemo(() => {
        const map: Record<string, string> = {};
        for (const p of projects.data?.items ?? []) map[p.id] = p.name;
        return map;
    }, [projects.data?.items]);

    const historyReports = historyQuery.data?.reports ?? [];
    const filteredHistory = useMemo(() => {
        return historyReports.filter((r) => {
            if (typeFilter === "all") return r.type === "board_pack" || r.type === "project_dossier";
            return r.type === typeFilter;
        });
    }, [historyReports, typeFilter]);

    const lastReports = useMemo(() => historyQuery.data?.display ?? historyReports, [historyQuery.data, historyReports]);

    useCopilotPage();
    useWorkspaceTopbarMeta(
        t("managerWorkspace.reportsPage.pageHeroTitle"),
        t("managerWorkspace.reportsPage.pageHeroSubtitle"),
        null,
    );

    const tabButtonClass = (active: boolean) =>
        cx(
            "rounded-full px-3 py-1 text-sm transition",
            active
                ? "bg-violet-100 font-medium text-violet-700 dark:bg-violet-950/50 dark:text-violet-200"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
        );

    return (
        <WorkspacePageShell role="manager" eyebrow="" title="" omitHeader>
            <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 sm:px-6 lg:px-8">
                <header className="border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-end gap-1.5" role="tablist">
                            <button type="button" role="tab" className={tabButtonClass(tab === "generate")} onClick={() => setTab("generate")}>
                                Génération
                            </button>
                            <button type="button" role="tab" className={tabButtonClass(tab === "history")} onClick={() => setTab("history")}>
                                Historique
                                {typeof historyQuery.data?.count === "number" && historyQuery.data.count > 0 ? (
                                    <span className="ml-1.5 text-xs opacity-60 tabular-nums">({historyQuery.data.count})</span>
                                ) : null}
                            </button>
                            <button type="button" role="tab" className={tabButtonClass(tab === "automation")} onClick={() => setTab("automation")}>
                                Automatisation
                            </button>
                    </div>
                </header>

                {!enterpriseId ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                        Session entreprise requise pour générer ou consulter les rapports backend.
                    </p>
                ) : null}

                {tab === "generate" ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <BoardPackCard />
                            <ProjectDossierCard />
                        </div>

                        {lastReports.length > 0 ? (
                            <section>
                                <h2 className="mb-2 text-xs uppercase tracking-widest text-slate-500">Derniers rapports</h2>
                                <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                                    {lastReports.slice(0, 3).map((report) => (
                                        <ReportHistoryRow
                                            key={report.reportId}
                                            report={report}
                                            compact
                                            projectNameById={projectNameById}
                                            onSend={setEmailReport}
                                            onDelete={setDeleteTarget}
                                        />
                                    ))}
                                </ul>
                            </section>
                        ) : null}
                    </div>
                ) : null}

                {tab === "history" ? (
                    <div className="space-y-3">
                        {historyQuery.isLoading ? (
                            <p className="py-8 text-center text-sm text-slate-500">Chargement…</p>
                        ) : null}

                        {historyQuery.isError ? (
                            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
                                Impossible de charger l&apos;historique.{" "}
                                <button type="button" onClick={() => void historyQuery.refetch()} className="underline">
                                    Réessayer
                                </button>
                            </p>
                        ) : null}

                        {!historyQuery.isLoading && historyReports.length === 0 ? (
                            <ProjectsEmptyState title="Aucun rapport généré pour l'instant" />
                        ) : null}

                        {!historyQuery.isLoading && historyReports.length > 0 ? (
                            <>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {HISTORY_TYPE_FILTERS.map((filter) => (
                                        <button
                                            key={filter.id}
                                            type="button"
                                            onClick={() => setTypeFilter(filter.id)}
                                            className={cx(
                                                "rounded-full px-3 py-1 text-sm transition",
                                                typeFilter === filter.id
                                                    ? ACTIVE_FILTER_CLASS[filter.tone]
                                                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                                            )}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>

                                <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                                    {filteredHistory.map((report) => (
                                        <ReportHistoryRow
                                            key={report.reportId}
                                            report={report}
                                            projectNameById={projectNameById}
                                            onSend={setEmailReport}
                                            onDelete={setDeleteTarget}
                                        />
                                    ))}
                                </ul>
                            </>
                        ) : null}
                    </div>
                ) : null}

                {tab === "automation" ? <ReportsScheduleForm /> : null}
            </div>

            <EmailReportDialog report={emailReport} onClose={() => setEmailReport(null)} />

            <ConfirmDialog
                isOpen={Boolean(deleteTarget)}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Supprimer ce rapport ?"
                body="Cette action est irréversible."
                confirmLabel="Supprimer"
                cancelLabel="Annuler"
                tone="danger"
                isConfirmLoading={deleteReport.isPending}
                onConfirm={() => {
                    if (!deleteTarget) return;
                    deleteReport.mutate(deleteTarget.reportId, { onSettled: () => setDeleteTarget(null) });
                }}
            />
        </WorkspacePageShell>
    );
}
