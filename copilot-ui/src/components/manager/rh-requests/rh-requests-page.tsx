import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileText, Inbox, LayoutGrid, Plus, Search, Table2 } from "lucide-react";
import type { RhActionRequestType } from "@/api/rh-actions.api";
import { MANAGER_RH_CANCEL_PATCH_BODY } from "@/api/rh-actions.constants";
import { getManagerWorkspaceProjects, parseManagerWorkspaceProjectsResponse } from "@/api/workspace-manager.api";
import { CreateRHRequestModal } from "@/components/manager/rh-requests/create-rh-request-modal";
import { formatRequestMessage } from "@/components/manager/rh-requests/formatRequestMessage";
import {
    RhActionsLoadingSkeleton,
    RhActionsWorkflowList,
} from "@/components/manager/rh-requests/manager-rh-actions-workflow-ui";
import { RhRequestSlideOver } from "@/components/manager/rh-requests/RhRequestSlideOver";
import {
    RH_EMPTY_BY_VIEW,
    RH_STATUS_VIEWS,
    matchesRhStatusView,
    rhStatusToView,
    sortRankForRhStatus,
    type RhStatusView,
} from "@/components/manager/rh-requests/rh-status-views";
import {
    TRIAGE_SEGMENT_ACTIVE,
    TRIAGE_SEGMENT_IDLE,
    TRIAGE_SEGMENTED,
    TRIAGE_TYPE_PILL_ACTIVE,
    TRIAGE_TYPE_PILL_IDLE,
} from "@/components/manager/inbox-triage/triage-ui";
import type { RhViewMode } from "@/components/rh-requests/RhRequestsHero";
import { RH_PRIMARY_CTA_CLASSES } from "@/components/rh-requests/rh-requests-styles";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import {
    mapRhActionsWorkflowError,
    usePatchRhActionMutation,
    usePostRhActionMutation,
    useRhActionsListQuery,
} from "@/hooks/use-rh-actions-query";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { labelRhActionType, RH_ACTION_TYPE_LABELS } from "@/lib/manager-rh-actions-labels";
import { useToast } from "@/providers/toast-provider";
import type { RhActionItem, RhActionPriority } from "@/types/manager-rh-actions.types";
import { UUID_REGEX } from "@/utils/rh-actions-workflow";
import { cx } from "@/utils/cx";

const REQUEST_TYPES = Object.keys(RH_ACTION_TYPE_LABELS) as RhActionRequestType[];
const RH_I18N = "managerWorkspace.rhRequests";

const HERO_TITLE = "Demandes RH";
const HERO_SUBTITLE =
    "Centralisez vos besoins de recrutement, formation, réaffectation et arbitrage RH.";

export default function RHRequestsPage() {
    const { t } = useTranslation(["common", "nav"]);
    const { push: toast } = useToast();

    useCopilotPage();
    useWorkspaceTopbarMeta(HERO_TITLE, HERO_SUBTITLE);

    const [statusView, setStatusView] = useState<RhStatusView>("all");
    const [apiProjectId, setApiProjectId] = useState<string | undefined>(undefined);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<RhViewMode>("table");
    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState<RhActionItem | null>(null);

    const [type, setType] = useState<RhActionRequestType | "">("");
    const [projectId, setProjectId] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [priority, setPriority] = useState<RhActionPriority | "">("normal");
    const [message, setMessage] = useState("");

    /** Filtre projet côté API uniquement — les vues statut sont 100 % frontend. */
    const listQuery = useRhActionsListQuery(
        { project_id: apiProjectId },
        { enabled: true },
    );
    const postMutation = usePostRhActionMutation();
    const patchMutation = usePatchRhActionMutation();

    const items = listQuery.data?.items ?? [];

    const managerProjectsQuery = useQuery({
        queryKey: ["manager-projects-select"],
        queryFn: async () => {
            const raw = await getManagerWorkspaceProjects({ page: 1, limit: 50 });
            return parseManagerWorkspaceProjectsResponse(raw);
        },
        staleTime: 300_000,
    });

    const projectOptions = useMemo(() => {
        const out: { id: string; label: string }[] = [];
        for (const item of managerProjectsQuery.data?.items ?? []) {
            const id = String(item.id ?? item.project_id ?? "").trim();
            if (!id) continue;
            const name = String(item.name ?? item.project_name ?? id.slice(0, 8)).trim();
            out.push({ id, label: name });
        }
        return out;
    }, [managerProjectsQuery.data?.items]);

    const viewCounts = useMemo(() => {
        const counts: Record<RhStatusView, number> = {
            all: items.length,
            pending: 0,
            in_progress: 0,
            accepted: 0,
            done: 0,
            refused_cancelled: 0,
        };
        for (const item of items) {
            counts[rhStatusToView(item.status)] += 1;
        }
        return counts;
    }, [items]);

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        const filtered = items.filter((item) => {
            if (!matchesRhStatusView(item.status, statusView)) return false;
            if (typeFilter !== "all" && item.type !== typeFilter) return false;
            if (!q) return true;
            const summary = formatRequestMessage(item).toLowerCase();
            const hay = `${summary} ${item.message} ${item.type} ${labelRhActionType(item.type)}`.toLowerCase();
            return hay.includes(q);
        });

        return [...filtered].sort((a, b) => {
            const rank = sortRankForRhStatus(a.status) - sortRankForRhStatus(b.status);
            if (rank !== 0) return rank;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [items, statusView, typeFilter, search]);

    const handleCancel = useCallback(
        async (id: string) => {
            try {
                await patchMutation.mutateAsync({ id, body: { ...MANAGER_RH_CANCEL_PATCH_BODY } });
                toast("Demande annulée", "success");
                setSelected((prev) => (prev?.id === id ? { ...prev, status: "cancelled" } : prev));
            } catch (err) {
                toast(mapRhActionsWorkflowError(err), "error");
            }
        },
        [patchMutation, toast],
    );

    const resetCreateForm = () => {
        setType("");
        setProjectId("");
        setAssignedTo("");
        setPriority("normal");
        setMessage("");
    };

    const submitCreate = async () => {
        if (!type || !message.trim()) return;
        if (message.length > 5000) return toast(t(`${RH_I18N}.toastSubmitFail`), "error");
        const resolvedPriority: RhActionPriority = priority || "normal";
        if (projectId.trim() && !UUID_REGEX.test(projectId.trim())) return toast(t(`${RH_I18N}.toastInvalidUuid`), "error");
        if (assignedTo.trim() && !UUID_REGEX.test(assignedTo.trim())) return toast(t(`${RH_I18N}.toastInvalidUuid`), "error");

        try {
            await postMutation.mutateAsync({
                type,
                message: message.trim(),
                priority: resolvedPriority,
                project_id: projectId.trim() || null,
                assigned_to: assignedTo.trim() || null,
            });
            resetCreateForm();
            setModalOpen(false);
            toast(t(`${RH_I18N}.toastSent`), "success");
            await listQuery.refetch();
        } catch (err) {
            toast(mapRhActionsWorkflowError(err), "error");
        }
    };

    const apiErrorMessage = listQuery.error ? mapRhActionsWorkflowError(listQuery.error) : null;
    const emptyCopy =
        items.length === 0 && statusView === "all" && typeFilter === "all" && !search.trim()
            ? RH_EMPTY_BY_VIEW.all
            : statusView !== "all"
              ? RH_EMPTY_BY_VIEW[statusView]
              : {
                    title: "Aucune demande ne correspond",
                    description: "Modifiez la recherche, le type ou la vue de statut.",
                };

    return (
        <WorkspacePageShell role="manager" eyebrow={t("workspaceRoles.manager")} title={HERO_TITLE} description={false} omitHeader>
            <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
                <div className="flex flex-wrap items-center gap-2">
                    <div className={TRIAGE_SEGMENTED} role="tablist" aria-label="Filtrer par statut">
                        {RH_STATUS_VIEWS.map((tab) => {
                            const active = statusView === tab.id;
                            const count = viewCounts[tab.id];
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setStatusView(tab.id)}
                                    className={cx(
                                        "rounded px-2.5 py-1 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary",
                                        active ? TRIAGE_SEGMENT_ACTIVE : TRIAGE_SEGMENT_IDLE,
                                    )}
                                >
                                    {tab.label}
                                    <span className="ml-1 tabular-nums text-tertiary">{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative min-w-[180px] flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-tertiary" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher (message, type)…"
                            className="h-8 w-full rounded-md border border-secondary bg-primary py-1.5 pl-8 pr-2 text-xs text-primary outline-none focus:border-brand-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setTypeFilter("all")}
                            className={cx(
                                "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary",
                                typeFilter === "all" ? TRIAGE_TYPE_PILL_ACTIVE : TRIAGE_TYPE_PILL_IDLE,
                            )}
                        >
                            Tous types
                        </button>
                        {REQUEST_TYPES.map((tpe) => (
                            <button
                                key={tpe}
                                type="button"
                                onClick={() => setTypeFilter(tpe)}
                                className={cx(
                                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary",
                                    typeFilter === tpe ? TRIAGE_TYPE_PILL_ACTIVE : TRIAGE_TYPE_PILL_IDLE,
                                )}
                            >
                                {labelRhActionType(tpe)}
                            </button>
                        ))}
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-secondary">
                        <span className="sr-only">Projet (filtre API)</span>
                        <select
                            value={apiProjectId ?? ""}
                            onChange={(e) => setApiProjectId(e.target.value.trim() || undefined)}
                            className="h-8 max-w-[160px] rounded-md border border-secondary bg-primary px-2 text-xs text-primary outline-none focus:border-brand-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
                            aria-label="Projet (filtre API)"
                        >
                            <option value="">Tous les projets</option>
                            {projectOptions.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div
                        className="inline-flex rounded-md border border-secondary/60 bg-secondary_subtle/80 p-0.5"
                        role="group"
                        aria-label="Mode d'affichage"
                    >
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={cx(
                                "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary",
                                viewMode === "table" ? TRIAGE_SEGMENT_ACTIVE : TRIAGE_SEGMENT_IDLE,
                            )}
                        >
                            <Table2 className="size-3.5" aria-hidden />
                            Tableau
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("kanban")}
                            className={cx(
                                "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary",
                                viewMode === "kanban" ? TRIAGE_SEGMENT_ACTIVE : TRIAGE_SEGMENT_IDLE,
                            )}
                        >
                            <LayoutGrid className="size-3.5" aria-hidden />
                            Kanban
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className={cx(RH_PRIMARY_CTA_CLASSES, "ml-auto h-8 rounded-md px-3 text-xs")}
                    >
                        <Plus className="size-3.5" aria-hidden />
                        Nouvelle demande RH
                    </button>
                </div>

                {listQuery.isPending ? <RhActionsLoadingSkeleton /> : null}

                {apiErrorMessage ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
                        {apiErrorMessage}
                        <button
                            type="button"
                            className="ml-2 font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                            onClick={() => void listQuery.refetch()}
                        >
                            Réessayer
                        </button>
                    </div>
                ) : null}

                {!listQuery.isPending && !apiErrorMessage && filteredItems.length === 0 ? (
                    <EmptyState
                        title={emptyCopy.title}
                        description={emptyCopy.description}
                        showCreate={items.length === 0}
                        onCreate={() => setModalOpen(true)}
                    />
                ) : null}

                {!listQuery.isPending && !apiErrorMessage && filteredItems.length > 0 ? (
                    <RhActionsWorkflowList
                        items={filteredItems}
                        viewMode={viewMode}
                        onRowClick={setSelected}
                    />
                ) : null}
            </div>

            <RhRequestSlideOver
                open={Boolean(selected)}
                item={selected}
                onClose={() => setSelected(null)}
                onCancel={(id) => void handleCancel(id)}
                isCancelling={patchMutation.isPending}
            />

            <CreateRHRequestModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                type={type}
                projectId={projectId}
                assignedTo={assignedTo}
                priority={priority}
                message={message}
                onType={setType}
                onProjectId={setProjectId}
                onAssignedTo={setAssignedTo}
                onPriority={setPriority}
                onMessage={setMessage}
                onSubmit={() => void submitCreate()}
                isSubmitting={postMutation.isPending}
                projectOptions={projectOptions}
                labels={{
                    modalTitle: t(`${RH_I18N}.modalTitle`),
                    modalSubtitle: t(`${RH_I18N}.modalSubtitle`),
                    fieldType: t(`${RH_I18N}.fieldType`),
                    fieldProjectOptional: t(`${RH_I18N}.fieldProjectOptional`),
                    fieldAssignedOptional: t(`${RH_I18N}.fieldAssignedOptional`),
                    fieldPriority: t(`${RH_I18N}.fieldPriority`),
                    fieldMessage: t(`${RH_I18N}.fieldMessage`),
                    noProjectOption: t(`${RH_I18N}.noProjectOption`),
                    placeholderMessage: t(`${RH_I18N}.placeholderMessage`),
                    placeholderAssignedSearch: t(`${RH_I18N}.placeholderAssignedSearch`),
                    clearAssignee: t(`${RH_I18N}.clearAssignee`),
                    cancel: t(`${RH_I18N}.modalCancel`),
                    send: t(`${RH_I18N}.sendToRh`),
                    sending: t(`${RH_I18N}.sending`),
                    abandonConfirm: t(`${RH_I18N}.abandonConfirm`),
                    errorTypeRequired: t(`${RH_I18N}.errorTypeRequired`),
                    errorMessageRequired: t(`${RH_I18N}.errorMessageRequired`),
                    loadingTeam: t(`${RH_I18N}.loadingTeam`),
                    noTeamMembers: t(`${RH_I18N}.noTeamMembers`),
                    typeRecruitment: t(`${RH_I18N}.typeRecruitment`),
                    typeTraining: t(`${RH_I18N}.typeTraining`),
                    typeReallocation: t(`${RH_I18N}.typeReallocation`),
                    typeOverload: t(`${RH_I18N}.typeOverload`),
                    typeSkillGap: t(`${RH_I18N}.typeSkillGap`),
                    typeDescRecruitment: t(`${RH_I18N}.typeDescRecruitment`),
                    typeDescTraining: t(`${RH_I18N}.typeDescTraining`),
                    typeDescReallocation: t(`${RH_I18N}.typeDescReallocation`),
                    typeDescOverload: t(`${RH_I18N}.typeDescOverload`),
                    typeDescSkillGap: t(`${RH_I18N}.typeDescSkillGap`),
                    priorityPillNormal: t(`${RH_I18N}.priorityPillNormal`),
                    priorityPillHigh: t(`${RH_I18N}.priorityPillHigh`),
                    priorityPillUrgent: t(`${RH_I18N}.priorityPillUrgent`),
                }}
            />
        </WorkspacePageShell>
    );
}

function EmptyState({
    title,
    description,
    showCreate,
    onCreate,
}: {
    title: string;
    description: string;
    showCreate: boolean;
    onCreate: () => void;
}) {
    return (
        <section className="flex flex-col items-center justify-center rounded-xl border border-dashed border-secondary bg-primary px-6 py-16 text-center shadow-xs">
            {showCreate ? <FileText className="size-12 text-tertiary" /> : <Inbox className="size-12 text-tertiary" />}
            <h2 className="mt-4 text-lg font-semibold text-primary">{title}</h2>
            <p className="mt-2 max-w-md text-sm text-secondary">{description}</p>
            {showCreate ? (
                <button type="button" className={cx(RH_PRIMARY_CTA_CLASSES, "mt-6")} onClick={onCreate}>
                    <Plus className="size-4" aria-hidden />
                    Nouvelle demande RH
                </button>
            ) : null}
        </section>
    );
}
