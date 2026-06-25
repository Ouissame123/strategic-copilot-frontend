import { LayersTwo02 } from "@untitledui/icons";
import type { RhToolUsed, SourceDB } from "@/api/rh-copilot.types";
import { cx } from "@/utils/cx";

const TABLE_LABELS: Record<string, string> = {
    "talent_skills+skills": "Compétences talents",
    risk_alerts: "Alertes risques",
    watchdog_alerts: "Watchdog",
    rh_actions: "Actions RH",
    "project_assignments (overload)": "Surcharges",
    "talents (pool)": "Pool talents",
    "projects+analysis_results": "Projets + KPI",
    strategist_arbitrage_options: "Arbitrages",
    "talents (contrats fin)": "Contrats expirants",
    get_overloaded_talents: "Surcharges",
    get_available_pool: "Pool dispo",
    search_talent_by_skill: "Recherche compétence",
    get_contracts_ending: "Contrats fin",
    get_projects_health: "Santé projets",
    get_skill_gaps: "Gaps compétences",
    get_risk_alerts: "Alertes risques",
    get_arbitrage_options: "Options arbitrage",
};

function labelFor(key: string): string {
    return TABLE_LABELS[key] || key;
}

export function SourcesPanel({ sources, toolsUsed }: { sources: SourceDB[]; toolsUsed?: RhToolUsed[] }) {
    const hasSources = sources?.length > 0;
    const hasTools = toolsUsed?.length > 0;
    if (!hasSources && !hasTools) return null;

    return (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            <LayersTwo02 className="size-3 shrink-0 text-fg-quaternary" aria-hidden />
            <span className="text-fg-quaternary">Sources :</span>
            {hasTools
                ? toolsUsed!.map((t) => (
                      <span
                          key={t.name}
                          className={cx(
                              "inline-flex h-5 items-center rounded-full border border-secondary px-1.5 text-[10px] font-normal text-fg-secondary",
                          )}
                      >
                          {labelFor(t.name)}
                          <span className="ml-1 text-fg-quaternary">({t.result_count})</span>
                      </span>
                  ))
                : sources.map((s, idx) => (
                      <span
                          key={`${s.table}-${idx}`}
                          className={cx(
                              "inline-flex h-5 items-center rounded-full border border-secondary px-1.5 text-[10px] font-normal text-fg-secondary",
                          )}
                      >
                          {labelFor(s.table)}
                          <span className="ml-1 text-fg-quaternary">({s.count})</span>
                      </span>
                  ))}
        </div>
    );
}
