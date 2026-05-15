import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router";
import { type PostRhActionBody, type RhActionRequestType } from "@/api/rh-actions.api";
import { getManagerWorkspaceProjects, parseManagerWorkspaceProjectsResponse } from "@/api/workspace-manager.api";
import { Button } from "@/components/base/buttons/button";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { usePatchRhActionMutation, usePostRhActionMutation, useRhActionsListQuery } from "@/hooks/use-rh-actions-query";
import { useToast } from "@/providers/toast-provider";
import { rowsFromRhActionsPayload } from "@/utils/rh-actions-list";
import { CreateRHRequestModal } from "./create-rh-request-modal";
import type { RHRequestCardRow } from "./rh-request-card";
import type { RhRequestRowModel } from "./rh-requests-data-table";
import { RHRequestDetailModal, RH_DETAIL_STATUS_PATCH } from "./rh-request-detail-modal";
import { RHRequestStats } from "./rh-request-stats";
import { RhRequestsTableSection } from "./rh-requests-table-section";
import {
    REQUEST_TYPE_ORDER,
    UUID_REGEX,
    assignedToFromRow,
    cardDescription,
    displayTitleFromRow,
    formatSentOnDateLong,
    kpiBucket,
    pickRhActionPatchId,
    resolveRhActionId,
    responseMessageFromRow,
    rowMatchesActionParam,
    rowPriorityDisplayBucket,
    type KpiBucket,
    type StatusFilter,
    typeTranslationKey,
} from "./rh-requests-utils";

const KPI_ITEMS: { id: KpiBucket; labelKey: string }[] = [
    { id: "pending", labelKey: "kpiPending" },
    { id: "accepted", labelKey: "kpiAccepted" },
    { id: "in_progress", labelKey: "kpiInProgress" },
    { id: "done", labelKey: "kpiDone" },
    { id: "rejected", labelKey: "kpiRejected" },
    { id: "cancelled", labelKey: "kpiCancelled" },
];

const FORM_PRIORITIES: { value: NonNullable<PostRhActionBody["priority"]>; key: string }[] = [
    { value: "urgent", key: "priorityUrgent" },
    { value: "normal", key: "priorityNormal" },
    { value: "low", key: "priorityLow" },
];

function rowProjectLabel(row: Record<string, unknown>, options: { id: string; label: string }[]): string | null {
    const name = String(row.project_name ?? row.project_title ?? "").trim();
    if (name) return name;
    const pid = String(row.project_id ?? "").trim();
    if (!pid) return null;
    const opt = options.find((o) => o.id === pid);
    if (opt) return opt.label.split(" · ")[0]?.trim() || opt.label;
    return pid.length > 12 ? `${pid.slice(0, 8)}…` : pid;
}

export default function RHRequestsPage() {
    const { t, i18n } = useTranslation(["common", "nav"]);
    const { push: toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const tr = useCallback(
        (key: string, options?: Record<string, string | number>) => t(`managerWorkspace.rhRequests.${key}`, options),
        [t],
    );

    useCopilotPage("none", t("nav:managerNavRhRequests"));

    const q = useRhActionsListQuery();
    const postRh = usePostRhActionMutation();
    const patchRh = usePatchRhActionMutation();

    /** Liste résolue (pas en chargement initial, pas d’erreur HTTP). */
    const listReady = !q.isPending && !q.error;

    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [detailRow, setDetailRow] = useState<RHRequestCardRow | null>(null);
    const [highlightedRhActionId, setHighlightedRhActionId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
    const [filterPriority, setFilterPriority] = useState<string>("all");
    const [search, setSearch] = useState("");

    const [type, setType] = useState<RhActionRequestType | "">("");
    const [projectId, setProjectId] = useState("");
    const [priority, setPriority] = useState<NonNullable<PostRhActionBody["priority"]> | "">("");
    const [requestTitle, setRequestTitle] = useState("");
    const [description, setDescription] = useState("");

    const rows = useMemo(() => rowsFromRhActionsPayload(q.data), [q.data]);

    const managerProjectsQuery = useQuery({
        queryKey: ["manager-projects-select"],
        queryFn: async () => {
            const raw = await getManagerWorkspaceProjects({ page: 1, limit: 50 });
            return parseManagerWorkspaceProjectsResponse(raw);
        },
        enabled: true,
    });

    const projectOptions = useMemo(() => {
        const items = managerProjectsQuery.data?.items ?? [];
        return items
            .map((item, idx) => {
                const id = String(item.id ?? item.project_id ?? "").trim();
                if (!id) return null;
                const name = String(item.name ?? item.project_name ?? `Projet ${idx + 1}`).trim();
                const code = String(item.project_code ?? "").trim();
                return { id, label: `${name} · ${code || id.slice(0, 8)}` };
            })
            .filter((x): x is { id: string; label: string } => x != null);
    }, [managerProjectsQuery.data?.items]);

    const kpiCounts = useMemo(() => {
        const counts: Record<KpiBucket, number> = {
            pending: 0,
            accepted: 0,
            in_progress: 0,
            done: 0,
            rejected: 0,
            cancelled: 0,
        };
        for (const row of rows) {
            counts[kpiBucket(row.status ?? row.state)] += 1;
        }
        return counts;
    }, [rows]);

    const rowTypeLabel = useCallback(
        (raw: unknown) => {
            const s = String(raw ?? "").trim() as RhActionRequestType;
            if (REQUEST_TYPE_ORDER.includes(s)) return tr(typeTranslationKey(s));
            return s || tr("statusUnknown");
        },
        [tr],
    );

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return rows.filter((row) => {
            const bucket = kpiBucket(row.status ?? row.state);
            if (filterStatus !== "all" && bucket !== filterStatus) return false;
            if (filterType !== "all") {
                const tk = String(row.type ?? "").trim();
                if (tk !== filterType) return false;
            }
            if (filterPriority !== "all") {
                const pb = rowPriorityDisplayBucket(row.priority);
                const pbNorm = pb === "" ? "normal" : pb;
                if (pbNorm !== filterPriority) return false;
            }
            if (needle) {
                const title = displayTitleFromRow(row, tr).toLowerCase();
                const desc = cardDescription(row, tr).toLowerCase();
                const typ = rowTypeLabel(row.type).toLowerCase();
                const proj = (rowProjectLabel(row, projectOptions) ?? "").toLowerCase();
                const rh = responseMessageFromRow(row).toLowerCase();
                if (!`${title} ${desc} ${typ} ${proj} ${rh}`.includes(needle)) return false;
            }
            return true;
        });
    }, [rows, filterStatus, filterType, filterPriority, search, tr, rowTypeLabel, projectOptions]);

    const tableData = useMemo((): RhRequestRowModel[] => {
        return filtered.map((row) => {
            const sentAt = row.created_at ?? row.sent_at ?? row.updated_at ?? row.submitted_at;
            const rawTs = sentAt;
            const n = new Date(String(rawTs ?? "")).getTime();
            const pl = rowProjectLabel(row, projectOptions);
            const tk = String(row.type ?? "").trim() as RhActionRequestType | "";
            const typeKey: RhActionRequestType | "" = REQUEST_TYPE_ORDER.includes(tk as RhActionRequestType) ? tk : "";
            return {
                _raw: row,
                typeKey,
                title: displayTitleFromRow(row, tr),
                typeLabel: rowTypeLabel(row.type),
                projectLabel: pl ?? "—",
                priorityBucket: rowPriorityDisplayBucket(row.priority),
                statusBucket: kpiBucket(row.status ?? row.state),
                createdTs: Number.isFinite(n) ? n : 0,
                createdLabel: formatSentOnDateLong(rawTs, i18n.language) || "—",
                actionId: resolveRhActionId(row),
                showCancel: kpiBucket(row.status ?? row.state) === "pending" && Boolean(pickRhActionPatchId(row)),
            };
        });
    }, [filtered, tr, rowTypeLabel, projectOptions, i18n.language]);

    const intentOpenedRef = useRef(false);
    useEffect(() => {
        if (intentOpenedRef.current) return;
        if (searchParams.get("intent") === "onboarding") {
            intentOpenedRef.current = true;
            setRequestModalOpen(true);
            const next = new URLSearchParams(searchParams);
            next.delete("intent");
            setSearchParams(next, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    /** Deep link : uniquement après GET liste — jamais d’appel GET /:id. Si l’id n’existe pas, on enlève le param sans erreur. */
    const actionParamHandledRef = useRef<string | null>(null);
    useEffect(() => {
        const hid = searchParams.get("action")?.trim();
        if (!hid) {
            actionParamHandledRef.current = null;
            setHighlightedRhActionId(null);
            return;
        }
        if (!q.isFetched) return;

        const found = rows.find((r) => rowMatchesActionParam(r, hid));
        if (!found) {
            if (actionParamHandledRef.current === `missing:${hid}`) return;
            actionParamHandledRef.current = `missing:${hid}`;
            setHighlightedRhActionId(null);
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("action");
                return next;
            }, { replace: true });
            return;
        }

        if (actionParamHandledRef.current === hid) return;
        actionParamHandledRef.current = hid;

        setFilterStatus("all");
        setFilterType("all");
        setFilterPriority("all");
        setSearch("");
        setHighlightedRhActionId(hid);

        const anchor = resolveRhActionId(found) || String(found.id ?? "").trim();
        const timer = window.setTimeout(() => {
            document.getElementById(`manager-rh-action-${anchor}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("action");
                return next;
            }, { replace: true });
        }, 120);
        const unhighlight = window.setTimeout(() => setHighlightedRhActionId(null), 6000);
        return () => {
            window.clearTimeout(timer);
            window.clearTimeout(unhighlight);
        };
    }, [searchParams, rows, q.isFetched, setSearchParams]);

    const resetForm = () => {
        setType("");
        setProjectId("");
        setPriority("");
        setRequestTitle("");
        setDescription("");
    };

    const submit = async () => {
        if (!type) {
            toast(tr("toastPickType"), "error");
            return;
        }
        if (projectId.trim() && !UUID_REGEX.test(projectId.trim())) {
            toast(tr("toastInvalidUuid"), "error");
            return;
        }
        if (!priority) {
            toast(tr("toastPickPriority"), "error");
            return;
        }
        if (!requestTitle.trim()) {
            toast(tr("toastPickTitle"), "error");
            return;
        }
        if (!description.trim()) {
            toast(tr("toastDescription"), "error");
            return;
        }
        const subjectLine = t("managerWorkspace.rhRequests.messageSubjectPrefix", { title: requestTitle.trim() });
        const messageBody = `${subjectLine}\n\n${description.trim()}`;
        const body: PostRhActionBody = {
            type,
            message: messageBody,
            priority,
            payload: { request_title: requestTitle.trim() },
        };
        if (projectId.trim()) body.project_id = projectId.trim();
        try {
            await postRh.mutateAsync(body);
            resetForm();
            setRequestModalOpen(false);
            await q.refetch();
            toast(tr("toastSubmitSuccess"), "success", 7000);
        } catch (e) {
            toast(e instanceof Error ? e.message : tr("toastSubmitFail"), "error");
        }
    };

    const cancelRequest = async (request: RHRequestCardRow) => {
        const actionId = pickRhActionPatchId(request as unknown as Record<string, unknown>);
        if (!actionId) {
            toast(tr("toastInvalidCancelId"), "error");
            return;
        }
        try {
            await patchRh.mutateAsync({
                id: actionId,
                body: RH_DETAIL_STATUS_PATCH.cancelled,
            });
            await q.refetch();
            setDetailRow((prev) => {
                if (!prev) return null;
                const prevId = pickRhActionPatchId(prev as unknown as Record<string, unknown>);
                if (prevId === actionId) return null;
                return prev;
            });
            toast(tr("toastCancelled"), "success");
        } catch (error) {
            console.error(error);
            toast(tr("toastCancelRhFailed"), "error");
        }
    };

    const openNewRequest = useCallback(() => setRequestModalOpen(true), []);

    const statsItems = useMemo(() => KPI_ITEMS.map(({ id, labelKey }) => ({ id, label: tr(labelKey) })), [tr]);

    const resetTableFilters = useCallback(() => {
        setFilterType("all");
        setFilterStatus("all");
        setFilterPriority("all");
        setSearch("");
    }, []);

    const typeFilterOptions = useMemo(
        () => [
            { value: "all", label: tr("filterAll") },
            ...REQUEST_TYPE_ORDER.map((value) => ({ value, label: tr(typeTranslationKey(value)) })),
        ],
        [tr],
    );

    const statusFilterOptions = useMemo(
        () =>
            [{ value: "all" as const, label: tr("filterAll") }, ...KPI_ITEMS.map(({ id, labelKey }) => ({ value: id, label: tr(labelKey) }))] as {
                value: StatusFilter;
                label: string;
            }[],
        [tr],
    );

    const priorityFilterOptions = useMemo(
        () => [
            { value: "all", label: tr("filterAll") },
            { value: "urgent", label: tr("priorityUrgent") },
            { value: "high", label: tr("priorityHigh") },
            { value: "normal", label: tr("priorityNormal") },
            { value: "low", label: tr("priorityLow") },
        ],
        [tr],
    );

    const tableFilterLabels = useMemo(
        () => ({
            type: tr("filterType"),
            status: tr("filterStatus"),
            priority: tr("filterPriority"),
            all: tr("filterAll"),
            reset: tr("resetFiltersShort"),
        }),
        [tr],
    );

    const typeOptionsForForm = useMemo(
        () => REQUEST_TYPE_ORDER.map((value) => ({ value, label: tr(typeTranslationKey(value)) })),
        [tr],
    );

    const modalLabels = useMemo(
        () => ({
            modalTitle: tr("modalTitle"),
            modalSubtitle: tr("modalSubtitle"),
            fieldType: tr("fieldType"),
            fieldProjectOptional: tr("fieldProjectOptional"),
            fieldPriority: tr("fieldPriority"),
            fieldRequestTitle: tr("fieldRequestTitle"),
            fieldDescription: tr("fieldDescription"),
            pickTypePlaceholder: tr("pickTypePlaceholder"),
            pickPriorityPlaceholder: tr("pickPriorityPlaceholder"),
            noProjectOption: tr("noProjectOption"),
            placeholderDescription: tr("placeholderDescription"),
            placeholderRequestTitle: tr("placeholderRequestTitle"),
            cancel: tr("modalCancel"),
            send: tr("sendToRh"),
        }),
        [tr],
    );

    const detailLabels = useMemo(
        () => ({
            dialogAccessibleTitle: tr("detailDialogAccessibleTitle"),
            detailEyebrow: tr("detailEyebrow"),
            detailProject: tr("detailProject"),
            detailSentAt: tr("detailSentAt"),
            detailMessage: tr("detailMessage"),
            detailRhResponse: tr("detailRhResponse"),
            detailAssignedTo: tr("detailAssignedTo"),
            close: tr("detailClose"),
        }),
        [tr],
    );

    const tableSectionCopy = useMemo(
        () => ({
            searchPlaceholder: tr("tableSearchPlaceholder"),
            empty: tr("tableEmptyState"),
            emptyFiltered: tr("tableEmptyFiltered"),
        }),
        [tr],
    );

    const tableLabels = useMemo(
        () => ({
            colTitle: tr("tableColTitle"),
            colType: tr("tableColType"),
            colProject: tr("tableColProject"),
            colPriority: tr("tableColPriority"),
            colStatus: tr("tableColStatus"),
            colCreated: tr("tableColCreated"),
            colActions: tr("tableColActions"),
            viewDetails: tr("actionDetail"),
            cancel: tr("actionCancel"),
            actionsMenuAria: tr("tableActionsMenuAria"),
        }),
        [tr],
    );

    const tableFilterFingerprint = useMemo(
        () => `${filterStatus}|${filterType}|${filterPriority}|${search.trim()}`,
        [filterStatus, filterType, filterPriority, search],
    );

    const kpiSlot = useMemo(
        () => (
            <RHRequestStats
                counts={kpiCounts}
                items={statsItems}
                filterStatus={filterStatus}
                onToggleStatus={(id) => setFilterStatus((prev) => (prev === id ? "all" : id))}
            />
        ),
        [kpiCounts, statsItems, filterStatus],
    );

    const topbarTrailing = useMemo(
        () => (
            <Button
                type="button"
                color="primary"
                size="md"
                className="w-full shrink-0 sm:w-auto"
                iconLeading={Plus}
                onClick={openNewRequest}
            >
                {tr("primaryCta")}
            </Button>
        ),
        [tr, openNewRequest],
    );

    useWorkspaceTopbarMeta(tr("heroTitle"), tr("heroSubtitle"), topbarTrailing);

    const detailSentAtDisplay = useMemo(() => {
        if (!detailRow) return null;
        const rawTs =
            detailRow.created_at ?? detailRow.sent_at ?? detailRow.updated_at ?? detailRow.submitted_at;
        return formatSentOnDateLong(rawTs, i18n.language) || null;
    }, [detailRow, i18n.language]);

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={tr("heroTitle")}
            description={false}
            omitHeader
        >
            <div className="space-y-4">
                {q.isPending ? <p className="text-sm text-tertiary">{tr("loadingList")}</p> : null}
                {q.error ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {q.error instanceof Error ? q.error.message : String(q.error)}
                    </p>
                ) : null}

                {listReady ? (
                    <RhRequestsTableSection
                        rowCount={rows.length}
                        filteredCount={filtered.length}
                        search={search}
                        onSearchChange={setSearch}
                        filterType={filterType}
                        onFilterType={setFilterType}
                        filterStatus={filterStatus}
                        onFilterStatus={setFilterStatus}
                        filterPriority={filterPriority}
                        onFilterPriority={setFilterPriority}
                        onResetTableFilters={resetTableFilters}
                        typeFilterOptions={typeFilterOptions}
                        statusFilterOptions={statusFilterOptions}
                        priorityFilterOptions={priorityFilterOptions}
                        filterLabels={tableFilterLabels}
                        tableData={tableData}
                        tableLabels={tableLabels}
                        tr={tr}
                        copy={tableSectionCopy}
                        filterFingerprint={tableFilterFingerprint}
                        kpiSlot={kpiSlot}
                        onViewDetails={setDetailRow}
                        onCancel={(r) => void cancelRequest(r)}
                        isCancelling={patchRh.isPending}
                        highlightedActionId={highlightedRhActionId}
                    />
                ) : null}
            </div>

            <CreateRHRequestModal
                open={requestModalOpen}
                onOpenChange={(open) => !open && setRequestModalOpen(false)}
                type={type}
                projectId={projectId}
                priority={priority}
                requestTitle={requestTitle}
                description={description}
                onType={setType}
                onProjectId={setProjectId}
                onPriority={setPriority}
                onRequestTitle={setRequestTitle}
                onDescription={setDescription}
                onSubmit={() => void submit()}
                isSubmitting={postRh.isPending}
                projectOptions={projectOptions}
                typeOptions={typeOptionsForForm}
                priorityOptions={FORM_PRIORITIES.map((p) => ({ value: p.value, label: tr(p.key) }))}
                labels={modalLabels}
            />

            {detailRow ? (
                <RHRequestDetailModal
                    open={Boolean(detailRow)}
                    onOpenChange={(open) => !open && setDetailRow(null)}
                    title={displayTitleFromRow(detailRow, tr)}
                    typeLabel={rowTypeLabel(detailRow.type)}
                    projectLabel={rowProjectLabel(detailRow, projectOptions)}
                    description={cardDescription(detailRow, tr)}
                    rhResponse={responseMessageFromRow(detailRow) || null}
                    assignedTo={assignedToFromRow(detailRow) || null}
                    sentAtDisplay={detailSentAtDisplay}
                    priorityBucket={rowPriorityDisplayBucket(detailRow.priority)}
                    statusBucket={kpiBucket(detailRow.status ?? detailRow.state)}
                    labels={detailLabels}
                    tr={tr}
                />
            ) : null}
        </WorkspacePageShell>
    );
}
