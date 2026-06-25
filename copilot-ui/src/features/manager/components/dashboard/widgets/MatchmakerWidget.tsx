import { Users01 } from "@untitledui/icons";
import type { DashboardResponse } from "@/features/manager/types/dashboard";
import { formatDisplayValue, readRecordNumber, readRecordString } from "@/features/manager/lib/dashboard-display";
import { AgentSourceBadge } from "../shared/AgentSourceBadge";
import { AgentStatusBadge } from "../shared/AgentStatusBadge";
import { EmptyState, WidgetStatRow } from "../shared/EmptyState";

export function MatchmakerWidget({ matchmaker }: { matchmaker: DashboardResponse["agents"]["matchmaker"] }) {
    const { stats, top_unassigned_matches, top_skill_gaps, active } = matchmaker;
    const topMatches = top_unassigned_matches.slice(0, 5);
    const topGaps = top_skill_gaps.slice(0, 5);

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                    <Users01 className="size-5 text-indigo-600" aria-hidden />
                    Matchmaker (Agent 4)
                </h3>
                <AgentStatusBadge status={active ? "active" : "empty"} />
            </div>
            {!active ? (
                <EmptyState title="Aucun matching actif" description="Le Matchmaker aligne talents et besoins projet." />
            ) : (
                <div className="space-y-3 text-sm">
                    <div className="space-y-2">
                        <WidgetStatRow label="Projets avec matching" value={stats.projects_with_matching} />
                        <WidgetStatRow label="Score moyen" value={formatDisplayValue(stats.avg_match_score)} />
                        <WidgetStatRow label="Gaps totaux" value={stats.total_gaps} />
                        <WidgetStatRow label="Recrutement" value={stats.recruitment_needed} colored="orange" />
                        <WidgetStatRow label="Formation" value={stats.training_needed} />
                        <WidgetStatRow label="Redéploiement" value={stats.redeploy_possible} colored="green" />
                    </div>
                    {topMatches.length > 0 ? (
                        <div className="border-t border-gray-100 pt-2">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Top matchs non assignés</p>
                            <div className="space-y-1">
                                {topMatches.map((row, index) => {
                                    const label =
                                        readRecordString(row, "talent_name") ??
                                        readRecordString(row, "project_name") ??
                                        readRecordString(row, "name") ??
                                        `Match ${index + 1}`;
                                    const score = readRecordNumber(row, "match_score") ?? readRecordNumber(row, "score");
                                    return (
                                        <div key={`${label}-${index}`} className="flex items-center justify-between text-xs">
                                            <span className="truncate text-gray-600">{label}</span>
                                            {score != null ? <span className="font-semibold tabular-nums">{score}</span> : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                    {topGaps.length > 0 ? (
                        <div className="border-t border-gray-100 pt-2">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Top skill gaps</p>
                            <div className="space-y-1">
                                {topGaps.map((row, index) => {
                                    const skill = readRecordString(row, "skill") ?? readRecordString(row, "skill_name") ?? `Gap ${index + 1}`;
                                    const count = readRecordNumber(row, "count") ?? readRecordNumber(row, "gap_count");
                                    return (
                                        <div key={`${skill}-${index}`} className="flex items-center justify-between text-xs">
                                            <span className="truncate text-gray-600">{skill}</span>
                                            {count != null ? <span className="font-semibold tabular-nums">{count}</span> : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
            <AgentSourceBadge agent="Matchmaker · Agent 4" />
        </div>
    );
}
