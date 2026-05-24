import type { FC } from "react";
import { Eye, MoreHorizontal } from "lucide-react";
import { priorityLabel, statusLabel } from "@/components/manager/rh-requests/rh-requests-utils";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { cx } from "@/utils/cx";

const MoreTriggerIcon: FC<{ className?: string }> = ({ className }) => (
    <MoreHorizontal className={cx("size-4 shrink-0", className)} strokeWidth={2} aria-hidden />
);
import type { RhRequestViewModel } from "./rhRequestFormatters";
import { priorityBadgeClass, statusBadgeClass, typeBadgeClass } from "./rhRequestFormatters";

type RhRequestsTableProps = {
    items: RhRequestViewModel[];
    tr: (k: string) => string;
    onDetail: (item: RhRequestViewModel) => void;
    onCancel?: (item: RhRequestViewModel) => void;
    highlightedId?: string | null;
    isCancelling?: boolean;
    labels: {
        colObject: string;
        colType: string;
        colProject: string;
        colPriority: string;
        colStatus: string;
        colSource: string;
        colSent: string;
        colActions: string;
        detail: string;
        cancel: string;
        actionsMenuAria: string;
    };
};

export function RhRequestsTable({
    items,
    tr,
    onDetail,
    onCancel,
    highlightedId,
    isCancelling,
    labels,
}: RhRequestsTableProps) {
    return (
        <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
                        <tr>
                            <th className="px-4 py-3">{labels.colObject}</th>
                            <th className="px-4 py-3">{labels.colType}</th>
                            <th className="px-4 py-3">{labels.colProject}</th>
                            <th className="px-4 py-3">{labels.colPriority}</th>
                            <th className="px-4 py-3">{labels.colStatus}</th>
                            <th className="px-4 py-3">{labels.colSource}</th>
                            <th className="px-4 py-3">{labels.colSent}</th>
                            <th className="px-4 py-3 text-right">{labels.colActions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {items.map((item) => (
                            <tr
                                key={item.id}
                                id={item.patchId ? `manager-rh-action-${item.patchId}` : undefined}
                                className={cx(
                                    "transition hover:bg-slate-50 dark:hover:bg-slate-800/40",
                                    highlightedId &&
                                        (highlightedId === item.id || highlightedId === item.patchId) &&
                                        "bg-amber-50/80 ring-1 ring-inset ring-amber-300 dark:bg-amber-950/30",
                                )}
                            >
                                <td className="max-w-xs px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => onDetail(item)}
                                        className="line-clamp-2 text-left font-medium text-slate-900 hover:text-brand dark:text-slate-100"
                                        title={item.objectFull}
                                    >
                                        {item.objectLabel}
                                    </button>
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={cx(
                                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                                            typeBadgeClass(item.typeKey),
                                        )}
                                    >
                                        {item.typeLabel}
                                    </span>
                                </td>
                                <td className="min-w-[10rem] max-w-md px-4 py-3 text-slate-600 dark:text-slate-400" title={item.projectLabel}>
                                    <span className="line-clamp-2">{item.projectLabel}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={cx(
                                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                                            priorityBadgeClass(item.priorityBucket),
                                        )}
                                    >
                                        {priorityLabel(item.priorityBucket, tr)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={cx(
                                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                                            statusBadgeClass(item.statusBucket),
                                        )}
                                    >
                                        {statusLabel(item.statusBucket, tr)}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-400">{item.sourceDisplay}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{item.createdLabel}</td>
                                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                    <Dropdown.Root>
                                        <Button
                                            color="tertiary"
                                            size="sm"
                                            className="min-h-8"
                                            iconLeading={MoreTriggerIcon}
                                            aria-label={labels.actionsMenuAria}
                                        />
                                        <Dropdown.Popover className="w-min">
                                            <Dropdown.Menu
                                                onAction={(key) => {
                                                    const k = String(key);
                                                    if (k === "detail") onDetail(item);
                                                    if (k === "cancel" && onCancel) onCancel(item);
                                                }}
                                            >
                                                <Dropdown.Item id="detail" textValue={labels.detail}>
                                                    <Eye className="size-4" />
                                                    {labels.detail}
                                                </Dropdown.Item>
                                                {item.showCancel && onCancel ? (
                                                    <Dropdown.Item id="cancel" textValue={labels.cancel} isDisabled={isCancelling}>
                                                        {labels.cancel}
                                                    </Dropdown.Item>
                                                ) : null}
                                            </Dropdown.Menu>
                                        </Dropdown.Popover>
                                    </Dropdown.Root>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
