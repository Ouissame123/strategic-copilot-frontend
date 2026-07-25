import type { DashboardAgentKey, DashboardAgentStatus } from "@/features/manager/types/dashboard-v3";
import { cx } from "@/utils/cx";
import { AGENT_LABELS } from "../lib/labels";

type AgentChipProps = {
    agentKey: DashboardAgentKey;
    status?: DashboardAgentStatus;
    compact?: boolean;
    className?: string;
};

export function AgentChip({ agentKey, status, compact, className }: AgentChipProps) {
    const active = status?.active ?? false;
    const hasData = status?.has_data ?? false;
    const tip = !active ? "Inactif" : hasData ? "Actif avec données" : "Actif sans données récentes";

    return (
        <span
            data-agent={agentKey}
            title={`${AGENT_LABELS[agentKey]} — ${tip}`}
            className={cx(
                "inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-1)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--text)]",
                compact && "px-1.5",
                className,
            )}
        >
            <span
                className={cx(
                    "size-1.5 shrink-0 rounded-full",
                    active ? "ops-agent-dot bg-[color:var(--agent-color)]" : "bg-[color:var(--text-muted)] opacity-40",
                )}
                style={active && !hasData ? { animationDelay: "1.2s", opacity: 0.65 } : active ? { animationDelay: `${agentKey.length * 0.15}s` } : undefined}
                aria-hidden
            />
            <span className="max-w-[7rem] truncate">{AGENT_LABELS[agentKey]}</span>
        </span>
    );
}
