import { useNavigate } from "react-router";
import { FileCheck02 } from "@untitledui/icons";
import type { DashboardResponse } from "@/features/manager/types/dashboard";
import { readRecordString } from "@/features/manager/lib/dashboard-display";
import { AgentSourceBadge } from "../shared/AgentSourceBadge";
import { AgentStatusBadge } from "../shared/AgentStatusBadge";
import { EmptyState, WidgetStatRow } from "../shared/EmptyState";

export function HelperWidget({ helper }: { helper: DashboardResponse["agents"]["helper"] }) {
    const navigate = useNavigate();
    const { stats, conflicts, missing_justif, active } = helper;
    const topConflicts = conflicts.slice(0, 3);
    const topMissing = missing_justif.slice(0, 3);

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                    <FileCheck02 className="size-5 text-amber-600" aria-hidden />
                    Helper (Agent 6)
                </h3>
                <AgentStatusBadge status={active ? "active" : "empty"} />
            </div>
            {!active ? (
                <EmptyState title="File vide" description="Le Helper traite les validations RH en attente." />
            ) : (
                <div className="space-y-3 text-sm">
                    <div className="space-y-2">
                        <WidgetStatRow label="En attente" value={stats.total_pending} />
                        <WidgetStatRow label="Conflits" value={stats.conflicts_count} colored="red" />
                        <WidgetStatRow label="Justificatifs manquants" value={stats.missing_count} colored="orange" />
                        <WidgetStatRow label="Standard" value={stats.standard_count} />
                        <WidgetStatRow label="SLA dépassé" value={stats.sla_overdue_count} colored="red" />
                    </div>

                    {topConflicts.length > 0 ? (
                        <div className="border-t border-gray-100 pt-2">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Conflits</p>
                            <div className="space-y-1">
                                {topConflicts.map((row, index) => {
                                    const label =
                                        readRecordString(row, "message") ??
                                        readRecordString(row, "title") ??
                                        readRecordString(row, "type") ??
                                        `Conflit ${index + 1}`;
                                    return (
                                        <p key={`${label}-${index}`} className="line-clamp-2 text-xs text-gray-600">
                                            {label}
                                        </p>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {topMissing.length > 0 ? (
                        <div className="border-t border-gray-100 pt-2">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Justificatifs manquants</p>
                            <div className="space-y-1">
                                {topMissing.map((row, index) => {
                                    const label =
                                        readRecordString(row, "message") ??
                                        readRecordString(row, "title") ??
                                        readRecordString(row, "type") ??
                                        `Item ${index + 1}`;
                                    return (
                                        <p key={`${label}-${index}`} className="line-clamp-2 text-xs text-gray-600">
                                            {label}
                                        </p>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => navigate("/workspace/manager/validations")}
                        className="text-sm font-medium text-purple-600 hover:text-purple-800"
                    >
                        Voir la file complète →
                    </button>
                </div>
            )}
            <AgentSourceBadge agent="Helper · Agent 6" />
        </div>
    );
}
