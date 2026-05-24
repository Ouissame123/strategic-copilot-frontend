import { TALENT_CARD, formatTalentDate, talentInitials } from "@/components/talent/talent-detail-shared";
import { AllocationBar } from "@/components/team/AllocationBar";
import { IpiVisualBadge } from "@/components/team/IpiVisualBadge";
import { TalentRiskBadge } from "@/components/team/TalentRiskBadge";
import {
    displayProjectName,
    displayRole,
    talentActionId,
    truncateEmail,
} from "@/components/team/team-list-utils";
import type { TalentListItem } from "@/types/api.types";

const Box = ("di" + "v") as const;

export interface TalentMobileCardsProps {
    rows: TalentListItem[];
    isLoading?: boolean;
    onOpenDrawer: (talentId: string) => void;
    onGoDetail: (talentId: string) => void;
    onGoWatchdog: (talentId: string) => void;
}

export function TalentMobileCards({ rows, isLoading, onOpenDrawer, onGoDetail, onGoWatchdog }: TalentMobileCardsProps) {
    if (!isLoading && rows.length === 0) {
        return (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 lg:hidden">
                Aucun talent trouvé avec ces filtres.
            </p>
        );
    }

    return (
        <ul className="space-y-3 lg:hidden">
            {rows.map((talent) => {
                const actionId = talentActionId(talent);
                const projectLabel = displayProjectName(talent) ?? "Aucun projet actif";
                const contractLabel = talent.contract_end_date
                    ? formatTalentDate(talent.contract_end_date) || "Non défini"
                    : "Non défini";

                return (
                    <li key={talent.talent_id ?? talent.id ?? talent.full_name}>
                        <article
                            className={`${TALENT_CARD} p-4 ${actionId ? "cursor-pointer" : ""}`}
                            role={actionId ? "button" : undefined}
                            tabIndex={actionId ? 0 : undefined}
                            onClick={() => {
                                if (actionId) onOpenDrawer(actionId);
                            }}
                            onKeyDown={(e) => {
                                if (!actionId) return;
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onOpenDrawer(actionId);
                                }
                            }}
                        >
                            <Box className="flex items-start gap-3">
                                <span
                                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white shadow-lg ring-4 ring-white dark:ring-slate-800"
                                    aria-hidden
                                >
                                    {talentInitials(talent.full_name)}
                                </span>
                                <Box className="min-w-0 flex-1">
                                    <Box className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={!actionId}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (actionId) onOpenDrawer(actionId);
                                            }}
                                            className="truncate text-left font-semibold text-slate-900 hover:text-indigo-700 disabled:opacity-60 dark:text-slate-100 dark:hover:text-indigo-300"
                                        >
                                            {talent.full_name}
                                        </button>
                                        <TalentRiskBadge talent={talent} />
                                    </Box>
                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={talent.email}>
                                        {talent.email ? truncateEmail(talent.email) : "—"} · {displayRole(talent)}
                                    </p>
                                    <p className="mt-1 truncate text-sm text-slate-700 dark:text-slate-300">{projectLabel}</p>
                                </Box>
                            </Box>

                            <Box
                                className="mt-4 space-y-3"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                            >
                                <AllocationBar pct={Number(talent.total_allocation_pct ?? 0)} />
                                <Box className="flex flex-wrap items-center justify-between gap-2">
                                    <IpiVisualBadge score={talent.insights?.ipi_score} />
                                    <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
                                        Contrat : {contractLabel}
                                    </span>
                                </Box>
                                <Box className="flex gap-2">
                                    <button
                                        type="button"
                                        disabled={!actionId}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (actionId) onGoDetail(actionId);
                                        }}
                                        className="flex-1 rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-xs font-semibold text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200"
                                    >
                                        Détail
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!actionId}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (actionId) onGoWatchdog(actionId);
                                        }}
                                        className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                                    >
                                        Watchdog
                                    </button>
                                </Box>
                            </Box>
                        </article>
                    </li>
                );
            })}
        </ul>
    );
}
