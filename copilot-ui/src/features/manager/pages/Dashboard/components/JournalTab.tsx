import type { DashboardAgentsStatus, DashboardRecentDecision } from "@/features/manager/types/dashboard-v3";
import { formatRelativeShort } from "@/lib/format-relative-short";
import { blocCardClass, confidencePct, viabilityToneClass } from "../dashboard-v3-ui";
import { AGENT_QUESTIONS, labelDecision } from "../lib/labels";
import { AgentChip } from "./AgentChip";
import { StatusBadge, decisionToBadgeVariant } from "./StatusBadge";
import { TruncatedList } from "./TruncatedList";

type JournalTabProps = {
    decisions: DashboardRecentDecision[];
    agentsStatus: DashboardAgentsStatus;
};

export function JournalTab({ decisions, agentsStatus }: JournalTabProps) {
    return (
        <div className="ops-tab-fade space-y-3" data-agent="observer">
            <div className="flex flex-wrap items-center gap-2">
                <AgentChip agentKey="observer" status={agentsStatus.observer} />
                <p className="text-[13px] text-[color:var(--text-muted)]">{AGENT_QUESTIONS.observer}</p>
            </div>

            <section className={blocCardClass("ops-agent-rail !p-3")}>
                <h3 className="mb-3 text-[13px] font-semibold text-[color:var(--text)]">Décisions récentes</h3>
                <TruncatedList
                    items={decisions}
                    max={5}
                    sheetTitle="Journal des décisions"
                    getKey={(d) => d.id}
                    empty={<p className="text-[13px] text-[color:var(--text-muted)]">Aucune décision récente.</p>}
                    renderItem={(item) => (
                        <div data-agent="observer" className="ops-card relative rounded-[10px] px-3 py-2 pl-4">
                            <span
                                className="absolute left-1.5 top-3 size-1.5 rounded-full bg-[color:var(--agent-color)]"
                                style={{ boxShadow: "0 0 8px var(--agent-color)" }}
                                aria-hidden
                            />
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[13px] font-medium text-[color:var(--text)]">{item.project_name}</p>
                                <StatusBadge variant={decisionToBadgeVariant(item.decision)}>
                                    {labelDecision(item.decision)}
                                </StatusBadge>
                                <span className="font-ops-data text-[11px] text-[color:var(--text-muted)]">
                                    {formatRelativeShort(item.created_at)}
                                </span>
                            </div>
                            {item.reason ? (
                                <p className="mt-1 text-[12px] text-[color:var(--text-muted)]">{item.reason}</p>
                            ) : null}
                            <p className={`mt-1 font-ops-data text-[12px] tabular-nums ${viabilityToneClass(item.score)}`}>
                                Score {item.score != null ? item.score.toFixed(1) : "—"}
                                {item.confidence != null ? ` · confiance ${confidencePct(item.confidence)}%` : ""}
                            </p>
                        </div>
                    )}
                />
            </section>
        </div>
    );
}
