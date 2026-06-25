import { BarChart01 } from "@untitledui/icons";
import type { DashboardResponse } from "@/features/manager/types/dashboard";
import { formatDisplayValue, readRecordNumber, readRecordString } from "@/features/manager/lib/dashboard-display";
import { cx } from "@/utils/cx";
import { AgentSourceBadge } from "../shared/AgentSourceBadge";
import { AgentStatusBadge } from "../shared/AgentStatusBadge";
import { EmptyState, WidgetStatRow } from "../shared/EmptyState";

const MOBILITY_COLORS = ["bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-violet-500", "bg-fuchsia-500"];

export function AnalystWidget({ analyst }: { analyst: DashboardResponse["agents"]["analyst"] }) {
    const { stats, mobility_breakdown, at_risk_talents, nine_box_matrix, active } = analyst;
    const topAtRisk = at_risk_talents.slice(0, 3);
    const matrixCells = Array.isArray(nine_box_matrix) ? nine_box_matrix.slice(0, 9) : [];

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                    <BarChart01 className="size-5 text-teal-600" aria-hidden />
                    Analyst (Agent 5)
                </h3>
                <AgentStatusBadge status={active ? "active" : "empty"} />
            </div>
            {!active ? (
                <EmptyState title="Aucune analyse équipe" description="L'Analyst évalue IPI, mobilité et 9-box." />
            ) : (
                <div className="space-y-3 text-sm">
                    <div className="space-y-2">
                        <WidgetStatRow label="Taille équipe" value={stats.team_size} />
                        <WidgetStatRow label="IPI moyen" value={formatDisplayValue(stats.ipi_avg)} />
                        <WidgetStatRow label="Étoiles" value={stats.stars_count} colored="green" />
                        <WidgetStatRow label="À risque" value={stats.at_risk_count} colored="red" />
                    </div>

                    {mobility_breakdown.length > 0 ? (
                        <div className="border-t border-gray-100 pt-2">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Mobilité</p>
                            <div className="space-y-2">
                                {mobility_breakdown.slice(0, 5).map((row, index) => {
                                    const label =
                                        readRecordString(row, "label") ??
                                        readRecordString(row, "mobility_flag") ??
                                        readRecordString(row, "flag") ??
                                        `Segment ${index + 1}`;
                                    const count = readRecordNumber(row, "count") ?? 0;
                                    const pct = readRecordNumber(row, "pct") ?? readRecordNumber(row, "percentage");
                                    return (
                                        <div key={`${label}-${index}`}>
                                            <div className="mb-0.5 flex items-center justify-between text-xs">
                                                <span className="truncate text-gray-600">{label}</span>
                                                <span className="font-semibold tabular-nums text-gray-900">{count}</span>
                                            </div>
                                            {pct != null ? (
                                                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                                                    <div
                                                        className={cx("h-full rounded-full", MOBILITY_COLORS[index % MOBILITY_COLORS.length])}
                                                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {matrixCells.length > 0 ? (
                        <div className="border-t border-gray-100 pt-2">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">9-box</p>
                            <div className="grid grid-cols-3 gap-1">
                                {matrixCells.map((cell, index) => {
                                    const label = readRecordString(cell, "label") ?? readRecordString(cell, "box_label") ?? "";
                                    const count = readRecordNumber(cell, "count") ?? 0;
                                    return (
                                        <div
                                            key={`${label}-${index}`}
                                            className="flex flex-col items-center justify-center rounded border border-gray-100 bg-gray-50 px-1 py-2 text-center"
                                        >
                                            <span className="text-sm font-bold tabular-nums text-gray-900">{count}</span>
                                            {label ? <span className="mt-0.5 line-clamp-2 text-[10px] text-gray-500">{label}</span> : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {topAtRisk.length > 0 ? (
                        <div className="border-t border-gray-100 pt-2">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Talents à risque</p>
                            <div className="space-y-1">
                                {topAtRisk.map((talent, index) => {
                                    const name = readRecordString(talent, "talent_name") ?? readRecordString(talent, "name") ?? `Talent ${index + 1}`;
                                    const flag = readRecordString(talent, "mobility_flag");
                                    return (
                                        <div key={`${name}-${index}`} className="flex items-center justify-between text-xs">
                                            <span className="truncate text-gray-700">{name}</span>
                                            {flag ? <span className="text-orange-600">{flag}</span> : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
            <AgentSourceBadge agent="Analyst · Agent 5" />
        </div>
    );
}
