import type { ComponentType, HTMLAttributes } from "react";
import {
    AlertTriangle,
    BarChart01,
    Beaker01,
    ChartBreakoutCircle,
    FileCheck02,
    Stars01,
    ZapFast,
} from "@untitledui/icons";
import { INTENT_TO_AGENT, type PdfAgent, type RhIntent } from "@/api/rh-copilot.types";
import { cx } from "@/utils/cx";

const AGENT_CONFIG: Record<
    PdfAgent,
    {
        Icon: ComponentType<HTMLAttributes<HTMLOrSVGElement>>;
        label: string;
        color: string;
        description: string;
    }
> = {
    observer: {
        Icon: ChartBreakoutCircle,
        label: "Observer",
        color: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
        description: "Agent 1 — État consolidé",
    },
    watchdog: {
        Icon: AlertTriangle,
        label: "Watchdog",
        color: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200",
        description: "Agent 2 — Détection risques",
    },
    strategist: {
        Icon: Beaker01,
        label: "Strategist",
        color: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200",
        description: "Agent 3 — Options arbitrage",
    },
    matchmaker: {
        Icon: Stars01,
        label: "Matchmaker",
        color: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-950/40 dark:text-pink-200",
        description: "Agent 4 — Matching compétences",
    },
    analyst: {
        Icon: BarChart01,
        label: "Analyst",
        color: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200",
        description: "Agent 5 — Insights talents",
    },
    helper: {
        Icon: FileCheck02,
        label: "Helper",
        color: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
        description: "Agent 6 — Validations RH",
    },
    orchestrator: {
        Icon: ZapFast,
        label: "Orchestrator",
        color: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
        description: "Routage IA",
    },
};

const LABEL_TO_AGENT: Record<string, PdfAgent> = {
    observer: "observer",
    watchdog: "watchdog",
    strategist: "strategist",
    matchmaker: "matchmaker",
    analyst: "analyst",
    helper: "helper",
    orchestrator: "orchestrator",
};

function agentsFromSourceAgent(sourceAgent: string): PdfAgent[] {
    return sourceAgent
        .split(/\s*\+\s*/)
        .map((part) => LABEL_TO_AGENT[part.trim().toLowerCase()])
        .filter((agent): agent is PdfAgent => Boolean(agent && agent in AGENT_CONFIG));
}

interface Props {
    intent: RhIntent | null;
    sourceAgent?: string;
}

export function AgentRoleBadge({ intent, sourceAgent }: Props) {
    if (!intent && !sourceAgent) return null;

    let agentList: PdfAgent[];
    if (sourceAgent?.trim()) {
        const fromBackend = agentsFromSourceAgent(sourceAgent);
        if (fromBackend.length) {
            agentList = fromBackend;
        } else if (intent) {
            const fromMap = INTENT_TO_AGENT[intent];
            agentList = Array.isArray(fromMap) ? fromMap : [fromMap];
        } else {
            return null;
        }
    } else if (intent) {
        const fromMap = INTENT_TO_AGENT[intent];
        agentList = Array.isArray(fromMap) ? fromMap : [fromMap];
    } else {
        return null;
    }

    if (!agentList.length) return null;

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {agentList.map((agent) => {
                const cfg = AGENT_CONFIG[agent];
                if (!cfg) return null;
                const Icon = cfg.Icon;
                return (
                    <div
                        key={agent}
                        className={cx("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs", cfg.color)}
                        title={cfg.description}
                    >
                        <Icon className="size-3" aria-hidden />
                        <span className="font-medium">{cfg.label}</span>
                    </div>
                );
            })}
        </div>
    );
}
