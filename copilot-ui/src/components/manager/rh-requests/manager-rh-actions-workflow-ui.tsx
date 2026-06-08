import type { RhActionItem } from "@/types/manager-rh-actions.types";
import {
    isRhActionPendingStatus,
    labelRhActionPriority,
    labelRhActionStatus,
    labelRhActionType,
} from "@/lib/manager-rh-actions-labels";
import { cx } from "@/utils/cx";

export const STATUS_TABS = [
    { id: "all", label: "Toutes" },
    { id: "pending", label: "En attente" },
    { id: "accepted", label: "Acceptées" },
    { id: "rejected", label: "Rejetées" },
    { id: "refused", label: "Refusées" },
    { id: "in_progress", label: "En cours" },
    { id: "cancelled", label: "Annulées" },
    { id: "closed", label: "Clôturées" },
    { id: "done", label: "Terminées" },
] as const;

export type StatusTabId = (typeof STATUS_TABS)[number]["id"];

function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function normalizeStatusKey(status: string): string {
    return status.toLowerCase().trim().replace(/\s+/g, "_");
}

function statusBadgeClass(status: string): string {
    const s = normalizeStatusKey(status);
    if (s === "accepted") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    if (s === "rejected" || s === "refused") return "bg-rose-50 text-rose-800 ring-rose-200";
    if (s === "cancelled" || s === "canceled") return "bg-slate-100 text-slate-700 ring-slate-200";
    if (s === "closed") return "bg-violet-50 text-violet-800 ring-violet-200";
    if (s === "done" || s === "completed" || s === "resolved") return "bg-sky-50 text-sky-800 ring-sky-200";
    if (s === "in_progress") return "bg-blue-50 text-blue-800 ring-blue-200";
    return "bg-amber-50 text-amber-900 ring-amber-200";
}

function priorityBadgeClass(priority: string): string {
    const p = priority.toLowerCase();
    if (p === "urgent") return "bg-red-50 text-red-800 ring-red-200";
    if (p === "low") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    return "bg-slate-100 text-slate-800 ring-slate-200";
}

export function RhActionsLoadingSkeleton() {
    return (
        <div className="space-y-3" aria-busy="true" aria-label="Chargement">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
            ))}
        </div>
    );
}

type RhActionsListProps = {
    items: RhActionItem[];
    onCancel: (id: string) => void;
    isPatching: boolean;
    viewMode: "table" | "kanban";
};

export function RhActionsWorkflowList({ items, onCancel, isPatching, viewMode }: RhActionsListProps) {
    if (viewMode === "kanban") {
        const columns: { key: string; title: string }[] = [
            { key: "pending", title: "En attente" },
            { key: "accepted", title: "Acceptées" },
            { key: "rejected", title: "Rejetées" },
            { key: "refused", title: "Refusées" },
            { key: "in_progress", title: "En cours" },
            { key: "cancelled", title: "Annulées" },
            { key: "closed", title: "Clôturées" },
            { key: "done", title: "Terminées" },
        ];
        return (
            <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
                {columns.map((col) => {
                    const colItems = items.filter((it) => {
                        const s = normalizeStatusKey(it.status);
                        if (col.key === "pending") return isRhActionPendingStatus(it.status);
                        if (col.key === "refused") return s === "refused";
                        if (col.key === "rejected") return s === "rejected";
                        if (col.key === "in_progress") return s === "in_progress" || s.includes("progress");
                        if (col.key === "done") return s === "done" || s === "completed" || s === "resolved";
                        if (col.key === "cancelled") return s === "cancelled" || s === "canceled";
                        return s === col.key;
                    });
                    return (
                        <div key={col.key} className="min-h-[120px] rounded-xl border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-700 dark:bg-slate-900/50">
                            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{col.title}</p>
                            <div className="space-y-2">
                                {colItems.map((item) => (
                                    <RhActionCard key={item.id} item={item} onCancel={onCancel} isPatching={isPatching} compact />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-950/60">
                        <tr>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Message</th>
                            <th className="px-4 py-3">Priorité</th>
                            <th className="px-4 py-3">Statut</th>
                            <th className="px-4 py-3">Créée le</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {items.map((item) => (
                            <tr key={item.id} className="align-top hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                                <td className="px-4 py-3 whitespace-nowrap">{labelRhActionType(item.type)}</td>
                                <td className="max-w-md px-4 py-3">
                                    <p className="line-clamp-3 text-slate-800 dark:text-slate-200">{item.message}</p>
                                    {item.response_message ? (
                                        <p className="mt-1 text-xs text-slate-500">Réponse : {item.response_message}</p>
                                    ) : null}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={cx("rounded-md px-2 py-0.5 text-xs font-semibold ring-1", priorityBadgeClass(item.priority))}>
                                        {labelRhActionPriority(item.priority)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={cx("rounded-md px-2 py-0.5 text-xs font-semibold ring-1", statusBadgeClass(item.status))}>
                                        {labelRhActionStatus(item.status)}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">{formatDate(item.created_at)}</td>
                                <td className="px-4 py-3">
                                    <ManagerActionCell item={item} onCancel={onCancel} isPatching={isPatching} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RhActionCard({
    item,
    onCancel,
    isPatching,
    compact,
}: {
    item: RhActionItem;
    onCancel: (id: string) => void;
    isPatching: boolean;
    compact?: boolean;
}) {
    return (
        <article className={cx("rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-600 dark:bg-slate-900", compact && "text-xs")}>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{labelRhActionType(item.type)}</p>
            <p className="mt-1 line-clamp-3 text-slate-600 dark:text-slate-400">{item.message}</p>
            <p className="mt-2 text-[10px] text-slate-500">{formatDate(item.created_at)}</p>
            <div className="mt-2">
                <ManagerActionCell item={item} onCancel={onCancel} isPatching={isPatching} stacked />
            </div>
        </article>
    );
}

function ManagerActionCell({
    item,
    onCancel,
    isPatching,
    stacked,
}: {
    item: RhActionItem;
    onCancel: (id: string) => void;
    isPatching: boolean;
    stacked?: boolean;
}) {
    if (!isRhActionPendingStatus(item.status)) {
        return (
            <span className={cx("text-xs text-slate-400 dark:text-slate-500", stacked ? "block" : "text-right")} aria-hidden>
                —
            </span>
        );
    }

    return (
        <div className={cx("flex", stacked ? "flex-col" : "justify-end")}>
            <button
                type="button"
                disabled={isPatching}
                onClick={() => onCancel(item.id)}
                className={cx(
                    "rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
                    stacked && "w-full text-left",
                )}
            >
                Annuler
            </button>
        </div>
    );
}
