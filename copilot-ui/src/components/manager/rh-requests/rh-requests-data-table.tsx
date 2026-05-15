import { useEffect, useMemo, useRef, useState, type FC } from "react";
import type { LucideIcon } from "lucide-react";
import {
    ArrowDown,
    ArrowUp,
    Ban,
    ChevronsUpDown,
    Eye,
    FileText,
    GraduationCap,
    MoreHorizontal,
    Shuffle,
    Target,
    UserPlus,
    Weight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RhActionRequestType } from "@/api/rh-actions.api";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { cx } from "@/utils/cx";
import type { RHRequestCardRow } from "./rh-request-card";
import type { KpiBucket, PriorityFilter } from "./rh-requests-utils";
import {
    priorityLabel,
    priorityPillClass,
    resolveRhActionId,
    rowMatchesActionParam,
    statusLabel,
    statusPillClass,
} from "./rh-requests-utils";

const TYPE_ICON_MAP: Record<string, LucideIcon> = {
    recruitment: UserPlus,
    training: GraduationCap,
    reallocation: Shuffle,
    skill_gap: Target,
    overload: Weight,
};

function TypeBadge({ typeKey, typeLabel }: { typeKey: string; typeLabel: string }) {
    const Icon = TYPE_ICON_MAP[typeKey] ?? FileText;
    return (
        <span className="inline-flex max-w-[min(100%,12rem)] items-center gap-1 rounded-md border border-secondary bg-secondary_subtle px-1.5 py-0.5 text-[11px] font-semibold text-secondary">
            <Icon className="size-3 shrink-0 text-fg-quaternary" strokeWidth={2} aria-hidden />
            <span className="min-w-0 truncate">{typeLabel}</span>
        </span>
    );
}

export type RhRequestRowModel = {
    _raw: RHRequestCardRow;
    typeKey: RhActionRequestType | "";
    title: string;
    typeLabel: string;
    projectLabel: string;
    priorityBucket: PriorityFilter;
    statusBucket: KpiBucket;
    createdTs: number;
    createdLabel: string;
    actionId: string;
    showCancel: boolean;
};

export type RhRequestsDataTableLabels = {
    colTitle: string;
    colType: string;
    colProject: string;
    colPriority: string;
    colStatus: string;
    colCreated: string;
    colActions: string;
    viewDetails: string;
    cancel: string;
    actionsMenuAria: string;
};

type SortKey = "title" | "typeLabel" | "projectLabel" | "priorityBucket" | "statusBucket" | "createdTs";
type SortDir = "asc" | "desc";

const priorityRank: Record<string, number> = { "": 4, urgent: 0, high: 1, normal: 2, low: 3 };
const statusRank: Record<KpiBucket, number> = {
    pending: 0,
    accepted: 1,
    in_progress: 2,
    done: 3,
    cancelled: 4,
    rejected: 5,
};

const EyeIc: FC<{ className?: string }> = ({ className }) => <Eye className={cx("size-4 shrink-0", className)} strokeWidth={2} aria-hidden />;
const BanIc: FC<{ className?: string }> = ({ className }) => <Ban className={cx("size-4 shrink-0", className)} strokeWidth={2} aria-hidden />;

const MoreTriggerIcon: FC<{ className?: string }> = ({ className }) => (
    <MoreHorizontal className={cx("size-4 shrink-0", className)} strokeWidth={2} aria-hidden />
);

function compareRows(a: RhRequestRowModel, b: RhRequestRowModel, key: SortKey, dir: SortDir): number {
    const sign = dir === "asc" ? 1 : -1;
    switch (key) {
        case "title":
            return sign * a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        case "typeLabel":
            return sign * a.typeLabel.localeCompare(b.typeLabel, undefined, { sensitivity: "base" });
        case "projectLabel":
            return sign * a.projectLabel.localeCompare(b.projectLabel, undefined, { sensitivity: "base" });
        case "priorityBucket":
            return sign * (priorityRank[String(a.priorityBucket)] - priorityRank[String(b.priorityBucket)]);
        case "statusBucket":
            return sign * (statusRank[a.statusBucket] - statusRank[b.statusBucket]);
        case "createdTs":
        default:
            return sign * (a.createdTs - b.createdTs);
    }
}

function SortHeader({
    columnKey,
    label,
    activeKey,
    activeDir,
    onSort,
}: {
    columnKey: SortKey;
    label: string;
    activeKey: SortKey;
    activeDir: SortDir;
    onSort: (key: SortKey) => void;
}) {
    const sorted = activeKey === columnKey ? activeDir : false;
    return (
        <button
            type="button"
            className="inline-flex max-w-full items-center gap-1 rounded-md px-0.5 py-0.5 text-left text-xs font-semibold text-fg-secondary outline-none transition hover:text-fg-primary focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-1"
            onClick={() => onSort(columnKey)}
        >
            <span className="min-w-0 truncate">{label}</span>
            {sorted === "desc" ? (
                <ArrowDown className="size-3 shrink-0 text-brand-secondary" aria-hidden />
            ) : sorted === "asc" ? (
                <ArrowUp className="size-3 shrink-0 text-brand-secondary" aria-hidden />
            ) : (
                <ChevronsUpDown className="size-3 shrink-0 opacity-40" aria-hidden />
            )}
        </button>
    );
}

type RhRequestsDataTableProps = {
    data: RhRequestRowModel[];
    labels: RhRequestsDataTableLabels;
    tr: (k: string) => string;
    onViewDetails: (row: RHRequestCardRow) => void;
    onCancel: (row: RHRequestCardRow) => void;
    isCancelling: boolean;
    pageSize?: number;
    highlightedActionId?: string | null;
    filterFingerprint?: string;
};

export function RhRequestsDataTable({
    data,
    labels,
    tr,
    onViewDetails,
    onCancel,
    isCancelling,
    pageSize = 10,
    highlightedActionId = null,
    filterFingerprint = "",
}: RhRequestsDataTableProps) {
    const { t } = useTranslation("common");
    const [sortKey, setSortKey] = useState<SortKey>("createdTs");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [pageIndex, setPageIndex] = useState(0);
    const [menuGen, setMenuGen] = useState(0);

    useEffect(() => {
        setPageIndex(0);
    }, [filterFingerprint]);

    const viewRef = useRef(onViewDetails);
    const cancelRef = useRef(onCancel);
    viewRef.current = onViewDetails;
    cancelRef.current = onCancel;

    const onSort = (key: SortKey) => {
        setPageIndex(0);
        if (sortKey !== key) {
            setSortKey(key);
            setSortDir(key === "createdTs" ? "desc" : "asc");
            return;
        }
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    };

    const sorted = useMemo(() => {
        const copy = [...data];
        copy.sort((a, b) => compareRows(a, b, sortKey, sortDir));
        return copy;
    }, [data, sortKey, sortDir]);

    const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(pageIndex, pageCount - 1);
    const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);
    const page = safePage + 1;
    const pages = pageCount;

    const hid = highlightedActionId?.trim() ?? "";

    const rowKey = (row: RhRequestRowModel) =>
        `${row.actionId || String(row._raw.id ?? "").trim() || "row"}-${String(row._raw._row_index ?? 0)}`;

    return (
        <div className="overflow-x-auto rounded-xl border border-secondary bg-primary text-fg-primary">
            <table className="min-w-full text-sm">
                <thead className="bg-secondary_subtle text-fg-secondary">
                    <tr>
                        <th className="px-3 py-2 text-left align-middle">
                            <SortHeader columnKey="title" label={labels.colTitle} activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
                        </th>
                        <th className="px-3 py-2 text-left align-middle">
                            <SortHeader columnKey="typeLabel" label={labels.colType} activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
                        </th>
                        <th className="px-3 py-2 text-left align-middle">
                            <SortHeader columnKey="projectLabel" label={labels.colProject} activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 text-left align-middle">
                            <SortHeader columnKey="priorityBucket" label={labels.colPriority} activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 text-left align-middle">
                            <SortHeader columnKey="statusBucket" label={labels.colStatus} activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
                        </th>
                        <th className="px-3 py-2 text-left align-middle">
                            <SortHeader columnKey="createdTs" label={labels.colCreated} activeKey={sortKey} activeDir={sortDir} onSort={onSort} />
                        </th>
                        <th className="w-12 px-3 py-2 text-right align-middle">
                            <span className="sr-only">{labels.colActions}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {pageRows.length ? (
                        pageRows.map((row) => {
                            const raw = row._raw;
                            const anchor = resolveRhActionId(raw) || String(raw.id ?? "").trim();
                            const domId = anchor ? `manager-rh-action-${anchor}` : undefined;
                            const isHi =
                                Boolean(hid) &&
                                (rowMatchesActionParam(raw, hid) ||
                                    anchor.toLowerCase() === hid.toLowerCase() ||
                                    String(raw.id ?? "")
                                        .trim()
                                        .toLowerCase() === hid.toLowerCase());
                            return (
                                <tr
                                    key={rowKey(row)}
                                    id={domId}
                                    className={cx(
                                        "border-t border-secondary transition-colors hover:bg-secondary_subtle/40",
                                        isHi && "bg-brand-secondary/10",
                                    )}
                                >
                                    <td className="px-3 py-2 align-middle">
                                        <span className="block max-w-[14rem] truncate font-medium text-fg-primary" title={row.title}>
                                            {row.title}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 align-middle">
                                        <TypeBadge typeKey={row.typeKey} typeLabel={row.typeLabel} />
                                    </td>
                                    <td className="px-3 py-2 align-middle">
                                        <span className="block max-w-[10rem] truncate text-secondary" title={row.projectLabel}>
                                            {row.projectLabel}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 align-middle">
                                        <span
                                            className={cx(
                                                "inline-flex rounded-full px-1.5 py-px text-[11px] font-semibold ring-1 ring-inset",
                                                priorityPillClass(row.priorityBucket),
                                            )}
                                        >
                                            {priorityLabel(row.priorityBucket, tr)}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 align-middle">
                                        <span
                                            className={cx(
                                                "inline-flex rounded-full px-1.5 py-px text-[11px] font-semibold ring-1 ring-inset",
                                                statusPillClass(row.statusBucket),
                                            )}
                                        >
                                            {statusLabel(row.statusBucket, tr)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 align-middle">
                                        <span className="whitespace-nowrap tabular-nums text-secondary">{row.createdLabel}</span>
                                    </td>
                                    <td className="px-3 py-2 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end">
                                            <Dropdown.Root key={`rh-menu-${rowKey(row)}-${menuGen}`}>
                                                <Button
                                                    color="tertiary"
                                                    size="sm"
                                                    className="min-h-8 text-fg-quaternary hover:bg-primary_hover"
                                                    iconLeading={MoreTriggerIcon}
                                                    aria-label={labels.actionsMenuAria}
                                                />
                                                <Dropdown.Popover className="w-min">
                                                    <Dropdown.Menu
                                                        onAction={(key) => {
                                                            const k = String(key);
                                                            if (k === "view-details") {
                                                                viewRef.current(raw);
                                                                return;
                                                            }
                                                            if (k === "cancel") {
                                                                setMenuGen((g) => g + 1);
                                                                void cancelRef.current(raw);
                                                            }
                                                        }}
                                                    >
                                                        <Dropdown.Item id="view-details" label={labels.viewDetails} icon={EyeIc} />
                                                        <Dropdown.Item
                                                            id="cancel"
                                                            label={labels.cancel}
                                                            icon={BanIc}
                                                            isDisabled={!row.showCancel || isCancelling}
                                                        />
                                                    </Dropdown.Menu>
                                                </Dropdown.Popover>
                                            </Dropdown.Root>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-sm text-tertiary">
                                —
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="flex flex-col gap-2 border-t border-secondary px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-3">
                <p className="text-xs text-tertiary">
                    {t("managerWorkspace.rhRequests.tableFooterSummary", { page, pages, rows: data.length })}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="rounded-lg border border-secondary bg-primary px-2.5 py-1 text-xs font-medium text-fg-secondary transition-colors hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={safePage <= 0}
                        onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                    >
                        {t("managerWorkspace.rhRequests.tablePaginationPrev")}
                    </button>
                    <button
                        type="button"
                        className="rounded-lg border border-secondary bg-primary px-2.5 py-1 text-xs font-medium text-fg-secondary transition-colors hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={safePage >= pageCount - 1}
                        onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                    >
                        {t("managerWorkspace.rhRequests.tablePaginationNext")}
                    </button>
                </div>
            </div>
        </div>
    );
}
