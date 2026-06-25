import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
    workflowStatusShowsReopen,
    workflowStatusShowsResolveIgnore,
} from "@/components/notifications/notification-alert-utils";
import type { ManagerRiskAlertPatchAction } from "@/services/notifications.api";
import { managerProjectMissionControlPath, managerProjectsOpenModalPath } from "@/utils/workspace-routes";
import { RootCauseHint, type AlertRootCauseTargetTab } from "./root-cause-hint";
import { cx } from "@/utils/cx";
import type { DisplayAlert, KanbanColumnId, RiskAlertPatchRequest } from "./risks-shared";
import { kanbanColumnForAlert, RISK_CARD, resolveRiskAlertPatchId, severityBadgeClass, timeAgo } from "./risks-shared";

const COLUMNS: { id: KanbanColumnId; label: string; hint: string }[] = [
    { id: "open", label: "Open", hint: "À traiter" },
    { id: "acknowledged", label: "Acknowledged", hint: "En cours" },
    { id: "resolved", label: "Resolved", hint: "Clôturées" },
];

type RiskTicketKanbanProps = {
    alerts: DisplayAlert[];
    loading?: boolean;
    analyzePending?: boolean;
    onOpen: (alert: DisplayAlert) => void;
    onPatch: (p: RiskAlertPatchRequest) => void;
    onAnalyze: (projectId: string) => void;
};

function KanbanTicketCard({
    alert,
    loading,
    analyzePending,
    onOpen,
    onPatch,
    onAnalyze,
}: {
    alert: DisplayAlert;
    loading: boolean;
    analyzePending: boolean;
    onOpen: () => void;
    onPatch: RiskTicketKanbanProps["onPatch"];
    onAnalyze: (projectId: string) => void;
}) {
    const navigate = useNavigate();
    const [showNote, setShowNote] = useState(false);
    const [note, setNote] = useState("");
    const showResolveIgnore = workflowStatusShowsResolveIgnore(alert.status);
    const showReopen = workflowStatusShowsReopen(alert.status);

    const navigateToTab = (tab: AlertRootCauseTargetTab) => {
        if (!alert.projectId) return;
        navigate(managerProjectMissionControlPath(alert.projectId, tab));
    };

    const submit = (action: ManagerRiskAlertPatchAction) => {
        onPatch({ id: alert.patchId, action, note: note.trim() || undefined });
        setShowNote(false);
        setNote("");
    };

    return (
        <article
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", resolveRiskAlertPatchId(alert) ?? alert.patchId);
                e.dataTransfer.effectAllowed = "move";
            }}
            className="cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-slate-700 dark:bg-slate-900"
        >
            <div className="flex flex-wrap items-center gap-1.5">
                <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", severityBadgeClass(alert.severity))}>
                    {alert.severity}
                </span>
                <span className="truncate text-[10px] text-slate-500">{alert.category}</span>
            </div>
            <button type="button" onClick={onOpen} className="mt-2 block w-full text-left">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{alert.projectName}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{alert.message}</p>
            </button>
            <p className="mt-1 text-[10px] text-slate-400">{timeAgo(alert.detectedAt)}</p>
            <RootCauseHint riskType={alert.riskType} onNavigateTab={alert.projectId ? navigateToTab : undefined} />
            {showNote ? (
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                    placeholder="Note…"
                />
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1">
                {showResolveIgnore ? (
                    <>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => submit("resolve")}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                        >
                            Résoudre
                        </button>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => submit("ignore")}
                            className="rounded-md bg-slate-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                        >
                            Ignorer
                        </button>
                    </>
                ) : null}
                {showReopen ? (
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => submit("reopen")}
                        className="rounded-md bg-violet-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                    >
                        Réouvrir
                    </button>
                ) : null}
                <button type="button" onClick={() => setShowNote((v) => !v)} className="rounded-md border border-slate-200 px-2 py-1 text-[10px] dark:border-slate-600">
                    Note
                </button>
                {alert.projectId ? (
                    <Link to={managerProjectsOpenModalPath(alert.projectId)} className="rounded-md border border-slate-200 px-2 py-1 text-[10px] dark:border-slate-600">
                        Projet
                    </Link>
                ) : null}
                <button
                    type="button"
                    disabled={!alert.projectId || analyzePending}
                    onClick={() => alert.projectId && onAnalyze(alert.projectId)}
                    className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-800 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/40"
                >
                    IA
                </button>
            </div>
        </article>
    );
}

export function RiskTicketKanban({ alerts, loading, analyzePending, onOpen, onPatch, onAnalyze }: RiskTicketKanbanProps) {
    const [columnOverrides, setColumnOverrides] = useState<Record<string, KanbanColumnId>>({});

    const grouped = useMemo(() => {
        const map: Record<KanbanColumnId, DisplayAlert[]> = { open: [], acknowledged: [], resolved: [] };
        for (const a of alerts) {
            const col = columnOverrides[a.patchId] ?? kanbanColumnForAlert(a);
            map[col].push(a);
        }
        return map;
    }, [alerts, columnOverrides]);

    const onDrop = useCallback(
        (column: KanbanColumnId, droppedId: string) => {
            const alert = alerts.find((a) => resolveRiskAlertPatchId(a) === droppedId || a.patchId === droppedId);
            if (!alert) return;
            const patchKey = resolveRiskAlertPatchId(alert) ?? alert.patchId;
            setColumnOverrides((prev) => ({ ...prev, [patchKey]: column }));
            const current = columnOverrides[patchKey] ?? kanbanColumnForAlert(alert);
            if (current === column) return;
            if (column === "resolved" && workflowStatusShowsResolveIgnore(alert.status)) {
                onPatch({ alert, action: "resolve" });
            } else if (column === "open" && workflowStatusShowsReopen(alert.status)) {
                onPatch({ alert, action: "reopen" });
            }
        },
        [alerts, columnOverrides, onPatch],
    );

    return (
        <section className="space-y-3">
            <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Risk tickets</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{alerts.length} ticket(s) · glisser-déposer entre colonnes</p>
            </div>
            <div className="-mx-1 flex gap-3 overflow-x-auto pb-2">
                {COLUMNS.map((col) => (
                    <div
                        key={col.id}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            const id = e.dataTransfer.getData("text/plain");
                            if (id) onDrop(col.id, id);
                        }}
                        className={cx(RISK_CARD, "min-w-[17rem] flex-1 p-3")}
                    >
                        <div className="mb-3 border-b border-slate-100 pb-2 dark:border-slate-800">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{col.label}</p>
                            <p className="text-[10px] text-slate-500">{col.hint} · {grouped[col.id].length}</p>
                        </div>
                        <div className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto">
                            {grouped[col.id].length === 0 ? (
                                <p className="py-6 text-center text-xs text-slate-400">Aucun ticket</p>
                            ) : (
                                grouped[col.id].map((a) => (
                                    <KanbanTicketCard
                                        key={a.patchId}
                                        alert={a}
                                        loading={Boolean(loading)}
                                        analyzePending={Boolean(analyzePending)}
                                        onOpen={() => onOpen(a)}
                                        onPatch={onPatch}
                                        onAnalyze={onAnalyze}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
