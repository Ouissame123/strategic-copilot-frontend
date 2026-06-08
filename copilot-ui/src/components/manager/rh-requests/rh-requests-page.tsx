import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileText, Inbox, Search } from "lucide-react";
import type { RhActionRequestType } from "@/api/rh-actions.api";
import { getManagerWorkspaceProjects, parseManagerWorkspaceProjectsResponse } from "@/api/workspace-manager.api";
import { CreateRHRequestModal } from "@/components/manager/rh-requests/create-rh-request-modal";
import {
    RhActionsLoadingSkeleton,
    RhActionsWorkflowList,
    STATUS_TABS,
    type StatusTabId,
} from "@/components/manager/rh-requests/manager-rh-actions-workflow-ui";
import { RhRequestsHero, type RhViewMode } from "@/components/rh-requests/RhRequestsHero";
import { RH_PRIMARY_CTA_CLASSES } from "@/components/rh-requests/rh-requests-styles";
import { TALENT_PAGE_BG } from "@/components/talent/talent-detail-shared";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import {
    mapRhActionsWorkflowError,
    usePatchRhActionMutation,
    usePostRhActionMutation,
    useRhActionsListQuery,
} from "@/hooks/use-rh-actions-query";
import {
    labelRhActionPriority,
    labelRhActionType,
    RH_ACTION_TYPE_LABELS,
    isRhActionPendingStatus,
} from "@/lib/manager-rh-actions-labels";
import { MANAGER_RH_CANCEL_PATCH_BODY } from "@/api/rh-actions.constants";
import { useToast } from "@/providers/toast-provider";
import type { RhActionItem, RhActionPriority } from "@/types/manager-rh-actions.types";
import { UUID_REGEX } from "@/utils/rh-actions-workflow";
import { cx } from "@/utils/cx";

const REQUEST_TYPES = Object.keys(RH_ACTION_TYPE_LABELS) as RhActionRequestType[];
const PRIORITIES: RhActionPriority[] = ["urgent", "normal", "low"];

const HERO_TITLE = "Demandes RH";
const HERO_SUBTITLE =
    "Centralisez vos besoins de recrutement, formation, réaffectation et arbitrage RH.";

function normalizeStatusKey(status: string): string {
    return status.toLowerCase().trim().replace(/\s+/g, "_");
}

function matchesStatusTab(item: RhActionItem, tab: StatusTabId): boolean {
    if (tab === "all") return true;
    const s = normalizeStatusKey(item.status);
    if (tab === "pending") return isRhActionPendingStatus(item.status);
    if (tab === "refused") return s === "refused";
    if (tab === "rejected") return s === "rejected";
    if (tab === "in_progress") return s === "in_progress" || s.includes("progress");
    if (tab === "done") return s === "done" || s === "completed" || s === "resolved";
    if (tab === "cancelled") return s === "cancelled" || s === "canceled";
    return s === tab;
}

export default function RHRequestsPage() {
    const { t } = useTranslation(["common", "nav"]);
    const { push: toast } = useToast();

    useCopilotPage("none", t("nav:managerNavRhRequests"));
    useWorkspaceTopbarMeta(HERO_TITLE, HERO_SUBTITLE);

    const [statusTab, setStatusTab] = useState<StatusTabId>("all");
    const [apiStatusFilter, setApiStatusFilter] = useState<string | undefined>(undefined);
    const [apiProjectId, setApiProjectId] = useState<string | undefined>(undefined);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<RhViewMode>("table");
    const [modalOpen, setModalOpen] = useState(false);

    const [type, setType] = useState<RhActionRequestType | "">("");
    const [projectId, setProjectId] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [priority, setPriority] = useState<RhActionPriority | "">("");
    const [message, setMessage] = useState("");

    const listQuery = useRhActionsListQuery(
        { status: apiStatusFilter, project_id: apiProjectId },
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

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter((item) => {
            if (!matchesStatusTab(item, statusTab)) return false;
            if (typeFilter !== "all" && item.type !== typeFilter) return false;
            if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
            if (!q) return true;
            const hay = `${item.message} ${item.type} ${item.priority} ${item.created_at}`.toLowerCase();
            return hay.includes(q);
        });
    }, [items, statusTab, typeFilter, priorityFilter, search]);

    const handleStatusTab = useCallback((tab: StatusTabId) => {
        setStatusTab(tab);
        if (tab === "all" || tab === "pending") {
            setApiStatusFilter(tab === "pending" ? "pending" : undefined);
        } else {
            setApiStatusFilter(tab);
        }
    }, []);

    const handleCancel = useCallback(
        async (id: string) => {
            try {
                await patchMutation.mutateAsync({ id, body: { ...MANAGER_RH_CANCEL_PATCH_BODY } });
                toast("Demande annulée", "success");
                await listQuery.refetch();
            } catch (err) {
                toast(mapRhActionsWorkflowError(err), "error");
            }
        },
        [patchMutation, listQuery, toast],
    );

    const submitCreate = async () => {
        if (!type) return toast("Choisissez un type de demande", "error");
        if (!message.trim()) return toast("Le message est obligatoire", "error");
        if (message.length > 5000) return toast("Message trop long (max 5000 caractères)", "error");
        if (!priority) return toast("Choisissez une priorité", "error");
        if (projectId.trim() && !UUID_REGEX.test(projectId.trim())) return toast("project_id invalide (UUID)", "error");
        if (assignedTo.trim() && !UUID_REGEX.test(assignedTo.trim())) return toast("assigned_to invalide (UUID)", "error");

        try {
            await postMutation.mutateAsync({
                type,
                message: message.trim(),
                priority,
                project_id: projectId.trim() || null,
                assigned_to: assignedTo.trim() || null,
            });
            setType("");
            setProjectId("");
            setAssignedTo("");
            setPriority("");
            setMessage("");
            setModalOpen(false);
            toast("Demande RH créée", "success");
            await listQuery.refetch();
        } catch (err) {
            toast(mapRhActionsWorkflowError(err), "error");
        }
    };

    const apiErrorMessage = listQuery.error ? mapRhActionsWorkflowError(listQuery.error) : null;

    return (
        <WorkspacePageShell role="manager" eyebrow={t("workspaceRoles.manager")} title={HERO_TITLE} description={false} omitHeader>
            <div className={cx("min-h-screen", TALENT_PAGE_BG)}>
                <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
                    <RhRequestsHero
                        title={HERO_TITLE}
                        subtitle={HERO_SUBTITLE}
                        ctaLabel="Nouvelle demande RH"
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        onNewRequest={() => setModalOpen(true)}
                    />

                    <div className="flex flex-wrap gap-2">
                        {STATUS_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleStatusTab(tab.id)}
                                className={cx(
                                    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                                    statusTab === tab.id
                                        ? "border-violet-400 bg-violet-600 text-white shadow-sm"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200",
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <section className="rounded-xl border border-slate-200/90 bg-white/90 p-4 shadow-sm dark:border-slate-600 dark:bg-slate-900/80">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <label className="block md:col-span-2">
                                <span className="mb-1 block text-xs font-semibold text-slate-600">Recherche</span>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Message, type, priorité…"
                                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-600 dark:bg-slate-950"
                                    />
                                </div>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-slate-600">Type</span>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                                >
                                    <option value="all">Tous</option>
                                    {REQUEST_TYPES.map((tpe) => (
                                        <option key={tpe} value={tpe}>
                                            {labelRhActionType(tpe)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-slate-600">Priorité</span>
                                <select
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                                >
                                    <option value="all">Toutes</option>
                                    {PRIORITIES.map((p) => (
                                        <option key={p} value={p}>
                                            {labelRhActionPriority(p)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block lg:col-span-2">
                                <span className="mb-1 block text-xs font-semibold text-slate-600">Projet (filtre API)</span>
                                <select
                                    value={apiProjectId ?? ""}
                                    onChange={(e) => setApiProjectId(e.target.value.trim() || undefined)}
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                                >
                                    <option value="">Tous les projets</option>
                                    {projectOptions.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </section>

                    {listQuery.isPending ? <RhActionsLoadingSkeleton /> : null}

                    {apiErrorMessage ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
                            {apiErrorMessage}
                            <button
                                type="button"
                                className="ml-2 font-semibold underline"
                                onClick={() => void listQuery.refetch()}
                            >
                                Réessayer
                            </button>
                        </div>
                    ) : null}

                    {!listQuery.isPending && !apiErrorMessage && filteredItems.length === 0 ? (
                        <EmptyState hasItems={items.length > 0} onCreate={() => setModalOpen(true)} />
                    ) : null}

                    {!listQuery.isPending && !apiErrorMessage && filteredItems.length > 0 ? (
                        <RhActionsWorkflowList
                            items={filteredItems}
                            viewMode={viewMode}
                            onCancel={(id) => void handleCancel(id)}
                            isPatching={patchMutation.isPending}
                        />
                    ) : null}
                </div>
            </div>

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
                typeOptions={REQUEST_TYPES.map((value) => ({ value, label: labelRhActionType(value) }))}
                priorityOptions={PRIORITIES.map((value) => ({ value, label: labelRhActionPriority(value) }))}
                labels={{
                    modalTitle: "Nouvelle demande RH",
                    modalSubtitle: "Workflow WF_Manager_RH_Actions — POST /webhook/api/rh/actions.",
                    fieldType: "Type de demande",
                    fieldProjectOptional: "Projet (optionnel)",
                    fieldAssignedOptional: "Assigné à (UUID optionnel)",
                    fieldPriority: "Priorité",
                    fieldMessage: "Message",
                    pickTypePlaceholder: "— Choisir —",
                    pickPriorityPlaceholder: "— Choisir —",
                    noProjectOption: "— Aucun projet —",
                    placeholderMessage: "Décrivez votre besoin RH…",
                    placeholderAssignedTo: "UUID talent / assigné (optionnel)",
                    cancel: "Annuler",
                    send: "Envoyer à RH",
                }}
            />
        </WorkspacePageShell>
    );
}

function EmptyState({ hasItems, onCreate }: { hasItems: boolean; onCreate: () => void }) {
    return (
        <section className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-900">
            {hasItems ? <Inbox className="size-12 text-slate-400" /> : <FileText className="size-12 text-slate-400" />}
            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
                {hasItems ? "Aucune demande ne correspond aux filtres" : "Aucune demande RH"}
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
                {hasItems
                    ? "Modifiez les filtres ou réinitialisez la recherche."
                    : "Créez votre première demande via le workflow n8n (POST /webhook/api/rh/actions)."}
            </p>
            {!hasItems ? (
                <button type="button" className={cx(RH_PRIMARY_CTA_CLASSES, "mt-6")} onClick={onCreate}>
                    Nouvelle demande RH
                </button>
            ) : null}
        </section>
    );
}
