import { isRhRequestDecider, priorityLabel, statusLabel, type RhRequestViewerRole } from "@/components/manager/rh-requests/rh-requests-utils";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import type { RhRequestViewModel } from "./rhRequestFormatters";
import { priorityBadgeClass, statusBadgeClass, typeBadgeClass } from "./rhRequestFormatters";

type RhRequestCardProps = {
    item: RhRequestViewModel;
    tr: (k: string) => string;
    onDetail: () => void;
    onAccept?: () => void;
    onReject?: () => void;
    onCancel?: () => void;
    viewerRole?: RhRequestViewerRole;
    isDragging?: boolean;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    labels: {
        detail: string;
        accept: string;
        reject: string;
        cancel?: string;
    };
};

export function RhRequestCard({
    item,
    tr,
    onDetail,
    onAccept,
    onReject,
    onCancel,
    viewerRole = "manager",
    isDragging,
    draggable: canDrag,
    onDragStart,
    labels,
}: RhRequestCardProps) {
    const isRhDecider = isRhRequestDecider(viewerRole);
    const showRhActions = isRhDecider && item.statusBucket === "pending";
    const showManagerCancel = !isRhDecider && item.showCancel && onCancel;

    return (
        <article
            draggable={isRhDecider && canDrag}
            onDragStart={onDragStart}
            className={cx(
                "cursor-grab rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition active:cursor-grabbing dark:border-slate-700 dark:bg-slate-900",
                isDragging && "opacity-60 ring-2 ring-brand",
            )}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                    className={cx(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset",
                        priorityBadgeClass(item.priorityBucket),
                    )}
                >
                    {priorityLabel(item.priorityBucket, tr)}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{item.sourceDisplay}</span>
            </div>

            <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-50" title={item.objectFull}>
                {item.objectLabel}
            </h3>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.projectLabel}</p>

            {item.description ? (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{item.description}</p>
            ) : null}

            {item.confidence != null ? (
                <p className="mt-2 text-[11px] font-medium text-primary-700 dark:text-primary-300">
                    Confiance Strategist : {item.confidence}%
                </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                    className={cx(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                        typeBadgeClass(item.typeKey),
                    )}
                >
                    {item.typeLabel}
                </span>
                <span
                    className={cx(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                        statusBadgeClass(item.statusBucket),
                    )}
                >
                    {statusLabel(item.statusBucket, tr)}
                </span>
            </div>

            <p className="mt-2 text-[11px] text-slate-500">{item.sentAgo}</p>

            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Button type="button" color="secondary" size="sm" onClick={onDetail}>
                    {labels.detail}
                </Button>
                {showRhActions && onAccept ? (
                    <Button type="button" color="primary" size="sm" onClick={onAccept}>
                        {labels.accept}
                    </Button>
                ) : null}
                {showRhActions && onReject ? (
                    <Button type="button" color="secondary-destructive" size="sm" onClick={onReject}>
                        {labels.reject}
                    </Button>
                ) : null}
                {showManagerCancel ? (
                    <Button type="button" color="secondary-destructive" size="sm" onClick={onCancel}>
                        {labels.cancel ?? "Annuler"}
                    </Button>
                ) : null}
            </div>
        </article>
    );
}
