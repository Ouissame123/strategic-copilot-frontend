import { useState } from "react";
import { httpClient } from "@/lib/http-client";
import { API_ROUTES } from "@/lib/api-routes";
import type { MissionControlAssignment, MissionControlRequirement } from "@/types/api.types";
import { AgentBlocShell } from "./agent-bloc-shell";
import { useMissionControlT } from "../use-mission-control-i18n";
import { cx } from "@/utils/cx";

type AgentMatchmakerPanelProps = {
    assignments: MissionControlAssignment[];
    requirements: MissionControlRequirement[];
    enterpriseId: string;
    projectId: string;
    onSimulateTalent?: (talentId: string, talentName: string) => void;
};

type TalentSuggestion = { talent_id: string; talent_name?: string; score?: number };

function allocTone(pct: number): string {
    if (pct > 100) return "bg-rose-500";
    if (pct >= 80) return "bg-amber-500";
    return "bg-emerald-500";
}

function initials(name: string | null | undefined): string {
    const p = (name ?? "?").trim().split(/\s+/);
    return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

export function AgentMatchmakerPanel({ assignments, requirements, enterpriseId, projectId, onSimulateTalent }: AgentMatchmakerPanelProps) {
    const { mc } = useMissionControlT();
    const [suggestions, setSuggestions] = useState<TalentSuggestion[] | null>(null);
    const [loading, setLoading] = useState(false);

    const mandatory = requirements.filter((r) => r.is_mandatory);

    const loadSuggestions = async () => {
        setLoading(true);
        try {
            const { data } = await httpClient.post<{ talents?: TalentSuggestion[] }>(API_ROUTES.AGENT_TALENTS(), {
                project_id: projectId,
                enterprise_id: enterpriseId,
            });
            setSuggestions(data.talents ?? []);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AgentBlocShell agentNumber={4} title={mc("agents.matchmaker")} accentClass="bg-emerald-100 text-emerald-800" className="p-3">
            <ul className="max-h-40 space-y-2 overflow-y-auto">
                {assignments.length === 0 ? (
                    <li className="text-xs text-slate-500">{mc("noAssignmentsOnProject")}</li>
                ) : (
                    assignments.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 text-xs">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-800">
                                {initials(a.talent_name)}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-slate-800 dark:text-slate-200">{a.talent_name ?? a.talent_id}</p>
                                <div className="mt-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700">
                                    <div
                                        className={cx("h-1 rounded-full", allocTone(a.allocation_pct))}
                                        style={{ width: `${Math.min(100, a.allocation_pct)}%` }}
                                    />
                                </div>
                            </div>
                            <span className="shrink-0 tabular-nums text-slate-500">{a.allocation_pct}%</span>
                        </li>
                    ))
                )}
            </ul>
            {mandatory.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                    {mandatory.map((r) => (
                        <span
                            key={r.id}
                            className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                        >
                            {r.skill_name ?? r.skill_id}
                        </span>
                    ))}
                </div>
            ) : null}
            <button
                type="button"
                disabled={loading}
                onClick={() => void loadSuggestions()}
                className="mt-3 w-full rounded border border-slate-200 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
                {loading ? "…" : mc("matchmaker.suggestions")}
            </button>
            {suggestions != null && suggestions.length > 0 ? (
                <ul className="mt-2 space-y-2">
                    {suggestions.slice(0, 5).map((s) => {
                        const name = s.talent_name ?? s.talent_id;
                        return (
                            <li
                                key={s.talent_id}
                                className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1.5 dark:border-slate-800"
                            >
                                <span className="min-w-0 truncate text-[10px] text-slate-600 dark:text-slate-400">
                                    {name}
                                    {s.score != null ? ` · ${s.score.toFixed(0)}%` : ""}
                                </span>
                                {onSimulateTalent ? (
                                    <button
                                        type="button"
                                        onClick={() => onSimulateTalent(s.talent_id, name)}
                                        className="shrink-0 rounded bg-primary-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-primary-700"
                                    >
                                        {mc("matchmaker.simulateBtn")}
                                    </button>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </AgentBlocShell>
    );
}
