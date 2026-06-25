import { LayersTwo02 } from "@untitledui/icons";
import type { ToolUsed } from "@/api/manager-copilot.types";
import { cx } from "@/utils/cx";

const TOOL_LABELS: Record<string, string> = {
    get_available_talents: "Talents dispo",
    get_team_workload: "Équipe",
    get_project_alerts: "Alertes",
    get_recent_decisions: "Décisions",
};

export function SourcesStrip({ toolsUsed, confidence }: { toolsUsed: ToolUsed[]; confidence: number }) {
    if (!toolsUsed?.length) {
        return (
            <div className="mt-2 flex items-center justify-end text-[10px] text-fg-quaternary">
                Confiance <span className="ml-1 font-medium text-primary">{Math.round(confidence * 100)}%</span>
            </div>
        );
    }

    return (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            <LayersTwo02 className="size-3 shrink-0 text-fg-quaternary" aria-hidden />
            <span className="text-fg-quaternary">Sources :</span>
            {toolsUsed.map((t) => (
                <span
                    key={t.name}
                    className={cx(
                        "inline-flex h-5 items-center rounded-full border border-secondary px-1.5 text-[10px] font-normal text-fg-secondary",
                    )}
                >
                    {TOOL_LABELS[t.name] || t.name}
                    <span className="ml-1 text-fg-quaternary">({t.result_count})</span>
                </span>
            ))}
            <span className="ml-auto text-fg-quaternary">
                Confiance <span className="font-medium text-primary">{Math.round(confidence * 100)}%</span>
            </span>
        </div>
    );
}
