import { useState } from "react";
import {
    isRhRequestDecider,
    statusLabel,
    type KpiBucket,
    type RhRequestViewerRole,
} from "@/components/manager/rh-requests/rh-requests-utils";
import { cx } from "@/utils/cx";
import { RhRequestCard } from "./RhRequestCard";
import { KANBAN_COLUMNS, statusBadgeClass, type RhRequestViewModel } from "./rhRequestFormatters";

type RhRequestsKanbanProps = {
    items: RhRequestViewModel[];
    tr: (k: string) => string;
    onDetail: (item: RhRequestViewModel) => void;
    onAccept?: (item: RhRequestViewModel) => void;
    onReject?: (item: RhRequestViewModel) => void;
    onCancel?: (item: RhRequestViewModel) => void;
    onStatusDrop?: (item: RhRequestViewModel, column: KpiBucket) => void;
    viewerRole?: RhRequestViewerRole;
    labels: {
        detail: string;
        accept: string;
        reject: string;
        cancel?: string;
    };
};

const COLUMN_LABELS: Record<KpiBucket, string> = {
    pending: "En attente",
    accepted: "Acceptées",
    in_progress: "En cours",
    done: "Terminées",
    rejected: "Rejetées",
    cancelled: "Annulées",
};

export function RhRequestsKanban({
    items,
    tr,
    onDetail,
    onAccept,
    onReject,
    onCancel,
    onStatusDrop,
    viewerRole = "manager",
    labels,
}: RhRequestsKanbanProps) {
    const isRhDecider = isRhRequestDecider(viewerRole);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<KpiBucket | null>(null);

    const byColumn = (col: KpiBucket) => items.filter((i) => i.statusBucket === col);

    const handleDragStart = (e: React.DragEvent, item: RhRequestViewModel) => {
        setDraggingId(item.id);
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDrop = (e: React.DragEvent, column: KpiBucket) => {
        e.preventDefault();
        setDropTarget(null);
        setDraggingId(null);
        const id = e.dataTransfer.getData("text/plain");
        const item = items.find((i) => i.id === id);
        if (!isRhDecider || !onStatusDrop) return;
        if (!item || item.statusBucket === column) return;
        onStatusDrop(item, column);
    };

    return (
        <div className="flex w-full gap-3 overflow-x-auto pb-2">
            {KANBAN_COLUMNS.map((col) => {
                const colItems = byColumn(col);
                return (
                    <section
                        key={col}
                        className={cx(
                            "flex w-[min(100%,280px)] shrink-0 flex-col rounded-xl border bg-slate-50/80 dark:bg-slate-950/50",
                            dropTarget === col ? "border-brand ring-2 ring-brand/30" : "border-slate-200 dark:border-slate-700",
                        )}
                        onDragOver={
                            isRhDecider
                                ? (e) => {
                                      e.preventDefault();
                                      setDropTarget(col);
                                  }
                                : undefined
                        }
                        onDragLeave={isRhDecider ? () => setDropTarget((prev) => (prev === col ? null : prev)) : undefined}
                        onDrop={isRhDecider ? (e) => handleDrop(e, col) : undefined}
                    >
                        <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                                {COLUMN_LABELS[col]}
                            </h3>
                            <span
                                className={cx(
                                    "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ring-1 ring-inset",
                                    statusBadgeClass(col),
                                )}
                            >
                                {colItems.length}
                            </span>
                        </header>
                        <ul className="flex max-h-[min(70vh,640px)] flex-col gap-2 overflow-y-auto p-2">
                            {colItems.map((item) => (
                                <li key={item.id}>
                                    <RhRequestCard
                                        item={item}
                                        tr={tr}
                                        viewerRole={viewerRole}
                                        onDetail={() => onDetail(item)}
                                        onAccept={onAccept ? () => onAccept(item) : undefined}
                                        onReject={onReject ? () => onReject(item) : undefined}
                                        onCancel={onCancel ? () => onCancel(item) : undefined}
                                        draggable={isRhDecider}
                                        isDragging={draggingId === item.id}
                                        onDragStart={isRhDecider ? (e) => handleDragStart(e, item) : undefined}
                                        labels={labels}
                                    />
                                </li>
                            ))}
                            {colItems.length === 0 ? (
                                <li className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500 dark:border-slate-700">
                                    {statusLabel(col, tr)}
                                </li>
                            ) : null}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}
