import { Database01 } from "@untitledui/icons";
import type { ToolUsed } from "@/api/helper-chat-v3.types";

const TOOL_LABELS: Record<string, string> = {
    get_project_kpis: "KPI projet",
    get_team_workload: "Équipe",
    get_project_alerts: "Alertes",
    get_available_talents: "Talents dispo",
    get_recent_decisions: "Décisions",
    get_skill_gaps: "Écarts compétences",
    get_arbitrage_options: "Options Strategist",
    get_milestones_progress: "Avancement",
};

type ChipsSourcesConsultedProps = {
    toolsUsed: ToolUsed[];
    confidence: number;
};

function confidenceLabel(confidence: number): string {
    if (!Number.isFinite(confidence)) return "—";
    const pct = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
    return `${pct}%`;
}

export function ChipsSourcesConsulted({ toolsUsed, confidence }: ChipsSourcesConsultedProps) {
    if (!toolsUsed?.length) {
        return (
            <div className="mt-2 flex items-center justify-end text-[10px] text-fg-tertiary">
                Confiance <span className="ml-1 font-medium tabular-nums">{confidenceLabel(confidence)}</span>
            </div>
        );
    }

    return (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            <Database01 className="size-3 shrink-0 text-fg-quaternary" aria-hidden />
            <span className="text-fg-tertiary">Sources :</span>
            {toolsUsed.map((tool) => (
                <span
                    key={tool.name}
                    className="inline-flex h-5 items-center rounded-full border border-secondary/60 bg-primary px-1.5 text-[10px] font-normal text-fg-secondary"
                >
                    {TOOL_LABELS[tool.name] || tool.name}
                    <span className="ml-1 text-fg-quaternary">({tool.result_count})</span>
                </span>
            ))}
            <span className="ml-auto text-fg-tertiary">
                Confiance <span className="font-medium tabular-nums">{confidenceLabel(confidence)}</span>
            </span>
        </div>
    );
}
