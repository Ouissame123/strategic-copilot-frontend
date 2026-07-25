import { useState, type DragEvent } from "react";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { PriorityDot } from "@/components/manager/inbox-triage/PriorityDot";
import { formatAbsoluteDateFr } from "@/components/manager/inbox-triage/triage-ui";
import { formatRequestMessage } from "@/components/manager/rh-requests/formatRequestMessage";
import { RhStatusBadge, RhTypeBadge } from "@/components/manager/rh-requests/rh-request-badges";
import { kanbanMoveTargets } from "@/components/manager/rh-requests/rh-kanban-status";
import {
    matchesRhStatusView,
    normalizeRhStatusKey,
    rhStatusToView,
    type RhStatusView,
} from "@/components/manager/rh-requests/rh-status-views";
import { formatRelativeShort } from "@/lib/format-relative-short";
import { isRhActionPendingStatus, labelRhActionType } from "@/lib/manager-rh-actions-labels";
import type { RhActionItem } from "@/types/manager-rh-actions.types";
import { cx } from "@/utils/cx";

export function RhActionsLoadingSkeleton() {
    return (
        <div className="overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs" aria-busy="true" aria-label="Chargement">
            <div className="space-y-0 divide-y divide-secondary">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                        <div className="h-5 w-28 animate-pulse rounded-full bg-secondary" />
                        <div className="h-4 flex-1 animate-pulse rounded bg-secondary" />
                        <div className="h-4 w-16 animate-pulse rounded bg-secondary" />
                        <div className="h-4 w-20 animate-pulse rounded bg-secondary" />
                    </div>
                ))}
            </div>
        </div>
    );
}

type RhActionsListProps = {
    items: RhActionItem[];
    viewMode: "table" | "kanban";
    onRowClick: (item: RhActionItem) => void;
    /** Déplacement Kanban (DnD + menu). */
    onMoveStatus?: (item: RhActionItem, targetView: Exclude<RhStatusView, "all">) => void;
    movingId?: string | null;
};

const KANBAN_COLUMNS: { key: Exclude<RhStatusView, "all">; title: string }[] = [
    { key: "pending", title: "En attente" },
    { key: "in_progress", title: "En cours" },
    { key: "accepted", title: "Acceptées" },
    { key: "done", title: "Terminées" },
    { key: "refused_cancelled", title: "Refusées & annulées" },
];

const COLUMN_TITLE: Record<Exclude<RhStatusView, "all">, string> = {
    pending: "En attente",
    in_progress: "En cours",
    accepted: "Acceptées",
    done: "Terminées",
    refused_cancelled: "Refusées & annulées",
};

const DND_MIME = "application/x-rh-action-id";

export function RhActionsWorkflowList({
    items,
    viewMode,
    onRowClick,
    onMoveStatus,
    movingId = null,
}: RhActionsListProps) {
    if (viewMode === "kanban") {
        return (
            <RhActionsKanbanBoard
                items={items}
                onRowClick={onRowClick}
                onMoveStatus={onMoveStatus}
                movingId={movingId}
            />
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs ring-1 ring-secondary/60">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-secondary bg-secondary_subtle/50 text-xs font-semibold uppercase tracking-wide text-tertiary">
                        <tr>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Message</th>
                            <th className="px-4 py-3">Priorité</th>
                            <th className="px-4 py-3">Statut</th>
                            <th className="px-4 py-3">Créée le</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary/80">
                        {items.map((item) => {
                            const summary = formatRequestMessage(item);
                            const abs = formatAbsoluteDateFr(item.created_at);
                            return (
                                <tr
                                    key={item.id}
                                    className="cursor-pointer align-top transition hover:bg-secondary_subtle/40 focus-within:bg-secondary_subtle/40"
                                    onClick={() => onRowClick(item)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            onRowClick(item);
                                        }
                                    }}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`Ouvrir la demande ${labelRhActionType(item.type)}`}
                                >
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <RhTypeBadge type={item.type} />
                                    </td>
                                    <td className="max-w-md px-4 py-3">
                                        <p className="line-clamp-2 font-medium text-primary">{summary || "—"}</p>
                                        {item.response_message ? (
                                            <p className="mt-1 text-xs text-slate-500">Réponse : {item.response_message}</p>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <PriorityDot priority={item.priority} />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <RhStatusBadge status={item.status} />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-secondary" title={abs || undefined}>
                                        {formatRelativeShort(item.created_at)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RhActionsKanbanBoard({
    items,
    onRowClick,
    onMoveStatus,
    movingId,
}: {
    items: RhActionItem[];
    onRowClick: (item: RhActionItem) => void;
    onMoveStatus?: (item: RhActionItem, targetView: Exclude<RhStatusView, "all">) => void;
    movingId: string | null;
}) {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [overColumn, setOverColumn] = useState<Exclude<RhStatusView, "all"> | null>(null);

    const clearDrag = () => {
        setDraggingId(null);
        setOverColumn(null);
    };

    const resolveItem = (id: string) => items.find((it) => it.id === id);

    const handleDropOnColumn = (column: Exclude<RhStatusView, "all">, e: DragEvent) => {
        e.preventDefault();
        const id = e.dataTransfer.getData(DND_MIME) || e.dataTransfer.getData("text/plain");
        clearDrag();
        if (!id || !onMoveStatus) return;
        const item = resolveItem(id);
        if (!item) return;
        if (rhStatusToView(item.status) === column) return;
        onMoveStatus(item, column);
    };

    return (
        <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-5" role="region" aria-label="Kanban des demandes RH">
            {KANBAN_COLUMNS.map((col) => {
                const colItems = items.filter((it) => matchesRhStatusView(it.status, col.key));
                const isOver = overColumn === col.key && draggingId != null;
                const showPlaceholder =
                    isOver && draggingId != null && !colItems.some((it) => it.id === draggingId);

                return (
                    <div
                        key={col.key}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (overColumn !== col.key) setOverColumn(col.key);
                        }}
                        onDragLeave={(e) => {
                            const related = e.relatedTarget as Node | null;
                            if (related && e.currentTarget.contains(related)) return;
                            if (overColumn === col.key) setOverColumn(null);
                        }}
                        onDrop={(e) => handleDropOnColumn(col.key, e)}
                        className={cx(
                            "min-h-[120px] rounded-xl border bg-secondary_subtle/40 p-2 transition",
                            isOver
                                ? "border-brand-secondary ring-2 ring-brand-secondary/50"
                                : "border-secondary",
                        )}
                        aria-label={`Colonne ${col.title}`}
                    >
                        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wide text-tertiary">
                            {col.title}
                            <span className="ml-1 tabular-nums text-secondary">({colItems.length})</span>
                        </p>
                        <div className="space-y-2">
                            {showPlaceholder ? (
                                <div
                                    className="rounded-lg border border-dashed border-brand-secondary/60 bg-brand-secondary/5 px-3 py-6 text-center text-[11px] text-tertiary"
                                    aria-hidden
                                >
                                    Déposer ici
                                </div>
                            ) : null}
                            {colItems.map((item) => (
                                <KanbanCard
                                    key={item.id}
                                    item={item}
                                    isDragging={draggingId === item.id}
                                    isMoving={movingId === item.id}
                                    onOpen={() => onRowClick(item)}
                                    onMoveStatus={onMoveStatus}
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData(DND_MIME, item.id);
                                        e.dataTransfer.setData("text/plain", item.id);
                                        e.dataTransfer.effectAllowed = "move";
                                        setDraggingId(item.id);
                                    }}
                                    onDragEnd={clearDrag}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function KanbanCard({
    item,
    isDragging,
    isMoving,
    onOpen,
    onMoveStatus,
    onDragStart,
    onDragEnd,
}: {
    item: RhActionItem;
    isDragging: boolean;
    isMoving: boolean;
    onOpen: () => void;
    onMoveStatus?: (item: RhActionItem, targetView: Exclude<RhStatusView, "all">) => void;
    onDragStart: (e: DragEvent) => void;
    onDragEnd: () => void;
}) {
    const currentView = rhStatusToView(item.status);
    const targets = kanbanMoveTargets(currentView);
    const summary = formatRequestMessage(item);

    return (
        <article
            draggable={Boolean(onMoveStatus)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={cx(
                "rounded-lg border border-secondary bg-primary p-3 text-left text-xs shadow-xs transition",
                onMoveStatus ? "cursor-grab active:cursor-grabbing" : null,
                isDragging ? "opacity-40" : "opacity-100",
                isMoving ? "pointer-events-none opacity-60" : null,
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <button
                    type="button"
                    onClick={onOpen}
                    className="min-w-0 flex-1 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
                >
                    <div className="flex items-start justify-between gap-2">
                        <RhTypeBadge type={item.type} />
                        <PriorityDot priority={item.priority} showLabel={false} />
                    </div>
                    <p className="mt-2 line-clamp-3 text-secondary">{summary || "—"}</p>
                    <p className="mt-2 text-[10px] text-tertiary" title={formatAbsoluteDateFr(item.created_at)}>
                        {formatRelativeShort(item.created_at)}
                    </p>
                </button>

                {onMoveStatus && targets.length > 0 ? (
                    <div
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onDragStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <Dropdown.Root>
                            <Dropdown.DotsButton className="size-7 min-h-0 p-1 text-tertiary hover:bg-secondary_subtle" />
                            <Dropdown.Popover className="w-52">
                                <Dropdown.Menu
                                    aria-label="Déplacer vers"
                                    onAction={(key) => {
                                        const target = String(key) as Exclude<RhStatusView, "all">;
                                        if (KANBAN_COLUMNS.some((c) => c.key === target)) {
                                            onMoveStatus(item, target);
                                        }
                                    }}
                                >
                                    <Dropdown.Section>
                                        <Dropdown.SectionHeader className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                                            Déplacer vers…
                                        </Dropdown.SectionHeader>
                                        {targets.map((target) => (
                                            <Dropdown.Item
                                                key={target}
                                                id={target}
                                                label={COLUMN_TITLE[target]}
                                                textValue={COLUMN_TITLE[target]}
                                            />
                                        ))}
                                    </Dropdown.Section>
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                    </div>
                ) : null}
            </div>
        </article>
    );
}

/** @deprecated Conservé pour imports éventuels — préférer `rh-status-views`. */
export const STATUS_TABS = [
    { id: "all", label: "Toutes" },
    { id: "pending", label: "En attente" },
    { id: "in_progress", label: "En cours" },
    { id: "accepted", label: "Acceptées" },
    { id: "done", label: "Terminées" },
    { id: "refused_cancelled", label: "Refusées & annulées" },
] as const;

export type StatusTabId = (typeof STATUS_TABS)[number]["id"];

export function statusPendingHint(status: string): boolean {
    return isRhActionPendingStatus(status) || normalizeRhStatusKey(status) === "pending";
}

export function kanbanColumnClass(active: boolean): string {
    return cx(
        "rounded-xl border p-2",
        active ? "border-brand-secondary/40 bg-brand-secondary/5" : "border-secondary bg-secondary_subtle/40",
    );
}
