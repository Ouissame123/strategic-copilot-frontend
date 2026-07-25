import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { decideTalentRequest } from "@/api/manager-talent-requests.api";
import { PendingValidationCard } from "@/components/validations/PendingValidationCard";
import { ValidationSkeleton } from "@/components/validations/ValidationSkeleton";
import {
    ValidationTierPills,
    type ValidationTierFilter,
} from "@/components/validations/ValidationTierPills";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useValidations } from "@/hooks/useValidations";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type { PendingValidation, PendingValidationsResponse } from "@/services/validations.api";
import { cx } from "@/utils/cx";

type RhScope = "mine" | "enterprise";

export default function ValidationsPage() {
    const { user } = useAuth();
    const isRh = user?.role === "rh";
    const isManager = user?.role === "manager";
    const enterpriseId = user?.enterpriseId?.trim() ?? "";
    const currentUserId = user?.id?.trim() ?? "";
    const { push } = useToast();

    const [rhScope, setRhScope] = useState<RhScope>("mine");
    const [tierFilter, setTierFilter] = useState<ValidationTierFilter>("all");
    const [actioningId, setActioningId] = useState<string | null>(null);

    const managerUserId = useMemo(() => {
        if (isManager) return currentUserId || null;
        if (isRh) return rhScope === "enterprise" ? null : currentUserId || null;
        return currentUserId || null;
    }, [isManager, isRh, rhScope, currentUserId]);

    const requestBody = useMemo(
        () =>
            enterpriseId
                ? { enterprise_id: enterpriseId, manager_user_id: managerUserId }
                : null,
        [enterpriseId, managerUserId],
    );

    const { data, isLoading, isFetching, refetch, error } = useValidations(requestBody);
    const qc = useQueryClient();

    const total = data?.total ?? 0;
    const counts = data?.counts ?? { conflict: 0, missing_justification: 0, standard: 0 };
    const items = data?.pending_validations ?? [];

    /** Filtre exclusif — ordre backend STRICT (jamais retrier). */
    const visibleItems = useMemo(() => {
        if (tierFilter === "all") return items;
        return items.filter((item) => item.tier === tierFilter);
    }, [items, tierFilter]);

    const subtitle = `Ce que vous devez valider, classé par priorité — ${total} demande(s) en attente.`;

    useCopilotPage();
    useWorkspaceTopbarMeta("Validations Copilot", subtitle);

    const removeItemLocally = useCallback(
        (item: PendingValidation) => {
            if (!enterpriseId) return;
            qc.setQueryData<PendingValidationsResponse>(
                queryKeys.manager.validations(enterpriseId, managerUserId),
                (prev) => {
                    if (!prev) return prev;
                    const pending_validations = prev.pending_validations.filter((row) => row.id !== item.id);
                    const nextCounts = { ...prev.counts };
                    nextCounts[item.tier] = Math.max(0, (nextCounts[item.tier] ?? 0) - 1);
                    return {
                        ...prev,
                        pending_validations,
                        counts: nextCounts,
                        total: Math.max(0, prev.total - 1),
                    };
                },
            );
        },
        [enterpriseId, managerUserId, qc],
    );

    const handleApprove = useCallback(
        (item: PendingValidation) => {
            if (actioningId) return;
            setActioningId(item.id);
            void decideTalentRequest(item.id, "accept")
                .then(() => {
                    removeItemLocally(item);
                    push("Demande acceptée.", "success");
                })
                .catch((err: unknown) => {
                    push(err instanceof Error ? err.message : "Erreur lors de la mise à jour", "error");
                })
                .finally(() => setActioningId(null));
        },
        [actioningId, push, removeItemLocally],
    );

    const handleReject = useCallback(
        (item: PendingValidation) => {
            if (actioningId) return;
            const reason = window.prompt("Motif du rejet :")?.trim();
            if (!reason) return;
            setActioningId(item.id);
            void decideTalentRequest(item.id, "refuse", reason)
                .then(() => {
                    removeItemLocally(item);
                    push("Demande refusée.", "success");
                })
                .catch((err: unknown) => {
                    push(err instanceof Error ? err.message : "Erreur lors de la mise à jour", "error");
                })
                .finally(() => setActioningId(null));
        },
        [actioningId, push, removeItemLocally],
    );

    const showEmpty = !isLoading && !error && total === 0;

    return (
        <WorkspacePageShell role="manager" eyebrow="" title="" omitHeader>
            <div className="mx-auto max-w-[960px] space-y-5 px-4 py-5 sm:px-6">
                {/* Toggle RH — sous le sous-titre topbar */}
                {isRh ? (
                    <div
                        className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900"
                        role="group"
                        aria-label="Périmètre des validations"
                    >
                        {(
                            [
                                { id: "mine" as const, label: "Mon équipe" },
                                { id: "enterprise" as const, label: "Toute l'entreprise" },
                            ] as const
                        ).map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                    setRhScope(opt.id);
                                    setTierFilter("all");
                                }}
                                aria-pressed={rhScope === opt.id}
                                className={cx(
                                    "rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
                                    rhScope === opt.id
                                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                ) : null}

                {!enterpriseId ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                        Identifiant entreprise manquant. Reconnectez-vous pour charger les validations.
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center dark:border-red-900/40 dark:bg-red-950/30">
                        <p className="mb-3 text-sm text-red-800 dark:text-red-200">
                            Impossible de charger les validations.
                        </p>
                        <button
                            type="button"
                            onClick={() => void refetch()}
                            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
                        >
                            Réessayer
                        </button>
                    </div>
                ) : null}

                {isLoading ? <ValidationSkeleton /> : null}

                {!isLoading && !error && enterpriseId && showEmpty ? (
                    <p className="py-16 text-center text-sm text-tertiary">Aucune validation en attente.</p>
                ) : null}

                {!isLoading && !error && enterpriseId && !showEmpty ? (
                    <>
                        <ValidationTierPills
                            total={total}
                            conflict={counts.conflict}
                            missingJustification={counts.missing_justification}
                            standard={counts.standard}
                            active={tierFilter}
                            onChange={setTierFilter}
                        />

                        <div className={cx("space-y-3", isFetching && "opacity-90")}>
                            {visibleItems.map((item) => (
                                <PendingValidationCard
                                    key={item.id}
                                    item={item}
                                    actioning={actioningId === item.id}
                                    disabled={Boolean(actioningId)}
                                    onApprove={() => handleApprove(item)}
                                    onReject={() => handleReject(item)}
                                />
                            ))}
                            {visibleItems.length === 0 ? (
                                <p className="py-8 text-center text-sm text-tertiary">
                                    Aucune validation pour ce filtre.
                                </p>
                            ) : null}
                        </div>

                        <p className="pt-2 text-center text-[11px] text-tertiary">
                            Trié par le backend : conflit → justification manquante → standard, puis priorité et
                            ancienneté
                        </p>
                    </>
                ) : null}
            </div>
        </WorkspacePageShell>
    );
}
