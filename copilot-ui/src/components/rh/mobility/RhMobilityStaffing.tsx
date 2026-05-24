/**
 * Mobilité & réaffectation — affectations RH talent → manager.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AssignmentFormDrawer } from "@/components/rh/mobility/AssignmentFormDrawer";
import type { DrawerIntent } from "@/components/rh/mobility/AssignmentDrawerContext";
import { DeleteAssignmentModal } from "@/components/rh/mobility/DeleteAssignmentModal";
import { StaffingAllocationBoard } from "@/components/rh/mobility/StaffingAllocationBoard";
import { StaffingKpiStrip } from "@/components/rh/mobility/StaffingKpiStrip";
import { StaffingToolbar } from "@/components/rh/mobility/StaffingToolbar";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { fetchRhTalentsList, RH_TALENTS_WEBHOOK_BASE } from "@/api/rh-talents.api";
import { resolveRhWebhookBase } from "@/api/rh-dashboard.api";
import {
    countTalentsWithManager,
    countTalentsWithoutManager,
    matchesManagerFilter,
    matchesSearch,
    type RhManagerFilter,
} from "@/lib/rh-assignments-display";
import {
    deleteRhAssignment,
    fetchRhAssignmentsList,
    fetchRhManagersList,
    mapRhAssignmentsError,
} from "@/services/rh-assignments.api";
import { useToast } from "@/providers/toast-provider";
import type { RhAssignmentRow, RhManagerListItem } from "@/types/rh-assignments.types";
import type { RhTalentListItem } from "@/types/rh-talents.types";
import { RH_ALERT_ERROR } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type RhMobilityStaffingProps = {
    enterpriseId: string;
    apiBase?: string;
    token?: string;
};

export function RhMobilityStaffing({ enterpriseId, apiBase = RH_TALENTS_WEBHOOK_BASE, token }: RhMobilityStaffingProps) {
    const { push: pushToast } = useToast();
    const resolvedBase = useMemo(() => resolveRhWebhookBase(apiBase), [apiBase]);

    const [assignments, setAssignments] = useState<RhAssignmentRow[]>([]);
    const [managers, setManagers] = useState<RhManagerListItem[]>([]);
    const [talents, setTalents] = useState<RhTalentListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [managerFilter, setManagerFilter] = useState<RhManagerFilter>("all");
    const [search, setSearch] = useState("");

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [drawerIntent, setDrawerIntent] = useState<DrawerIntent>("create");
    const [editRow, setEditRow] = useState<RhAssignmentRow | null>(null);
    const [initialTalentId, setInitialTalentId] = useState<string | null>(null);
    const [initialManagerUserId, setInitialManagerUserId] = useState<string | null>(null);

    const [deleteRow, setDeleteRow] = useState<RhAssignmentRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadData = useCallback(
        async (mode: "initial" | "refresh" = "initial") => {
            if (!enterpriseId.trim()) {
                setError("Identifiant entreprise manquant");
                setLoading(false);
                return;
            }
            if (mode === "refresh") setRefreshing(true);
            else setLoading(true);
            setError(null);
            try {
                const [assignRes, talentsRes] = await Promise.all([
                    fetchRhAssignmentsList({ status: "all", limit: 200 }, { token, apiBase: resolvedBase }),
                    fetchRhTalentsList({ enterprise_id: enterpriseId, status: "all", limit: 500 }, { token, apiBase }),
                ]);
                setAssignments(assignRes.assignments);
                setTalents(talentsRes.talents);
                setError(null);

                try {
                    const managersRes = await fetchRhManagersList({ token, apiBase: resolvedBase });
                    setManagers(managersRes.managers);
                } catch {
                    setManagers([]);
                }
            } catch (e) {
                setError(mapRhAssignmentsError(e));
                setAssignments([]);
                setManagers([]);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [enterpriseId, token, resolvedBase, apiBase],
    );

    useEffect(() => {
        void loadData("initial");
    }, [loadData]);

    const filteredRows = useMemo(
        () =>
            assignments.filter(
                (row) => matchesSearch(row, search) && matchesManagerFilter(row, managerFilter),
            ),
        [assignments, search, managerFilter],
    );

    const withManagerCount = useMemo(() => countTalentsWithManager(assignments), [assignments]);
    const withoutManagerCount = useMemo(() => countTalentsWithoutManager(assignments), [assignments]);

    const openDrawer = useCallback(
        (opts: {
            mode: "create" | "edit";
            intent: DrawerIntent;
            row?: RhAssignmentRow | null;
            talentId?: string | null;
            managerUserId?: string | null;
        }) => {
            setFormMode(opts.mode);
            setDrawerIntent(opts.intent);
            setEditRow(opts.row ?? null);
            setInitialTalentId(opts.talentId ?? opts.row?.talent_id ?? null);
            setInitialManagerUserId(opts.managerUserId ?? opts.row?.manager_user_id ?? null);
            setFormOpen(true);
        },
        [],
    );

    const openCreate = useCallback(() => {
        openDrawer({ mode: "create", intent: "create", row: null, talentId: null, managerUserId: null });
    }, [openDrawer]);

    const handleSaved = () => {
        void loadData("refresh");
    };

    const handleDelete = async () => {
        const id = deleteRow?.talent_id ?? deleteRow?.id;
        if (!id) return;
        setDeleting(true);
        try {
            await deleteRhAssignment(id, { token, apiBase: resolvedBase });
            pushToast("Affectation retirée.", "success");
            setDeleteRow(null);
            void loadData("refresh");
        } catch (e) {
            pushToast(mapRhAssignmentsError(e), "error");
        } finally {
            setDeleting(false);
        }
    };

    useWorkspaceTopbarMeta("", null, null);

    return (
        <WorkspacePageShell role="rh" eyebrow="" title="" description={false} omitHeader>
            <div className="mx-auto max-w-[1600px] space-y-5 pb-8">
                {error ? (
                    <div className={cx("flex items-start gap-2 rounded-lg p-3 text-sm", RH_ALERT_ERROR)}>
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
                        <span>{error}</span>
                    </div>
                ) : null}

                <StaffingKpiStrip
                    loading={loading}
                    total={assignments.length}
                    withManager={withManagerCount}
                    withoutManager={withoutManagerCount}
                />

                <StaffingToolbar
                    search={search}
                    onSearchChange={setSearch}
                    managerFilter={managerFilter}
                    onManagerFilterChange={setManagerFilter}
                    refreshing={refreshing}
                    onRefresh={() => void loadData("refresh")}
                    onCreate={openCreate}
                />

                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-[56px] animate-pulse rounded-xl border border-slate-200/60 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
                            />
                        ))}
                    </div>
                ) : (
                    <StaffingAllocationBoard
                        rows={filteredRows}
                        onAssign={(row) =>
                            openDrawer({
                                mode: "create",
                                intent: row.manager_user_id ? "reassign" : "create",
                                row: null,
                                talentId: row.talent_id ?? null,
                                managerUserId: null,
                            })
                        }
                        onReassign={(row) =>
                            openDrawer({
                                mode: "create",
                                intent: "reassign",
                                row: null,
                                talentId: row.talent_id ?? null,
                                managerUserId: null,
                            })
                        }
                        onRemove={setDeleteRow}
                        onCreate={openCreate}
                        emptyMessage={
                            assignments.length === 0
                                ? "Aucun talent dans la liste — créez une affectation."
                                : "Aucun résultat pour ces filtres."
                        }
                    />
                )}
            </div>

            <AssignmentFormDrawer
                open={formOpen}
                mode={formMode}
                intent={drawerIntent}
                assignment={editRow}
                initialTalentId={initialTalentId}
                initialManagerUserId={initialManagerUserId}
                talents={talents}
                managers={managers}
                apiBase={resolvedBase}
                token={token}
                onClose={() => setFormOpen(false)}
                onSaved={handleSaved}
            />

            <DeleteAssignmentModal
                open={Boolean(deleteRow)}
                assignment={deleteRow}
                submitting={deleting}
                onClose={() => setDeleteRow(null)}
                onConfirm={() => void handleDelete()}
            />
        </WorkspacePageShell>
    );
}
