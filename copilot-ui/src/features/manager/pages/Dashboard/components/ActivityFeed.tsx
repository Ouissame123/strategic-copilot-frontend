import type { DashboardRecentDecision } from "@/features/manager/types/dashboard-v3";
import { formatRelativeShort } from "@/lib/format-relative-short";
import { TruncatedList } from "./TruncatedList";
import { StatusBadge, decisionToBadgeVariant } from "./StatusBadge";
import { labelDecision } from "../lib/labels";

type ActivityFeedProps = {
    decisions: DashboardRecentDecision[];
};

export function ActivityFeed({ decisions }: ActivityFeedProps) {
    return (
        <TruncatedList
            items={decisions}
            max={6}
            sheetTitle="Activité récente"
            getKey={(d) => d.id}
            empty={<p className="text-[13px] text-[color:var(--text-muted)]">Aucune décision récente.</p>}
            renderItem={(item) => (
                <div data-agent="observer" className="relative pl-4">
                    <span
                        className="absolute left-0 top-1.5 size-2 rounded-full bg-[color:var(--agent-color)]"
                        style={{ boxShadow: "0 0 8px var(--agent-color)" }}
                        aria-hidden
                    />
                    <p className="text-[13px] text-[color:var(--text)]">
                        L&apos;Observateur a mis à jour <span className="font-medium">{item.project_name}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge variant={decisionToBadgeVariant(item.decision)}>
                            {labelDecision(item.decision)}
                        </StatusBadge>
                        <span className="font-ops-data text-[11px] text-[color:var(--text-muted)]">
                            {formatRelativeShort(item.created_at)}
                        </span>
                    </div>
                    {item.reason ? (
                        <p className="mt-1 line-clamp-2 text-[12px] text-[color:var(--text-muted)]">{item.reason}</p>
                    ) : null}
                </div>
            )}
        />
    );
}
