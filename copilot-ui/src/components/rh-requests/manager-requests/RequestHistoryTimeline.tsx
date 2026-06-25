import { ArrowRight } from "lucide-react";
import type { RhRequestDecisionHistoryEntry } from "@/api/rh-requests-decision.api";
import { EmptyState } from "@/components/ui/EmptyState";
import { labelRhRequestStatus } from "@/utils/rh-requests-decision";
import { RequestStatusBadge } from "./RequestStatusBadge";

function formatDecisionDate(iso: string | null | undefined): string {
    if (!iso?.trim()) return "—";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "—";
    return new Date(iso).toLocaleString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
        value,
    );
}

type RequestHistoryTimelineProps = {
    decisions: RhRequestDecisionHistoryEntry[];
};

export function RequestHistoryTimeline({ decisions }: RequestHistoryTimelineProps) {
    if (decisions.length === 0) {
        return (
            <EmptyState size="md" className="py-10">
                <EmptyState.Content>
                    <EmptyState.Title>Aucune décision encore</EmptyState.Title>
                    <EmptyState.Description>Les changements de statut apparaîtront ici.</EmptyState.Description>
                </EmptyState.Content>
            </EmptyState>
        );
    }

    return (
        <ul className="space-y-1 p-4" aria-label="Historique des décisions">
            {decisions.map((d) => {
                const prevLabel = d.previous_status_label || labelRhRequestStatus(d.previous_status);
                const nextLabel = d.new_status_label || labelRhRequestStatus(d.new_status);
                return (
                    <li key={d.id} className="relative border-l-2 border-border pb-4 pl-8 ml-3 dark:border-slate-700">
                        <div
                            className="absolute -left-[5px] top-1 size-2.5 rounded-full bg-brand-solid"
                            aria-hidden
                        />
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium text-secondary">{prevLabel}</span>
                            <ArrowRight size={12} className="text-muted-foreground" aria-hidden />
                            <span className="font-semibold text-primary">{nextLabel}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            <time dateTime={d.created_at}>{formatDecisionDate(d.created_at)}</time>
                            {d.assigned_to_name ? (
                                <>
                                    {" "}
                                    • Assigné à <strong>{d.assigned_to_name}</strong>
                                </>
                            ) : null}
                            {d.budget_approved != null ? <> • Budget {formatCurrency(d.budget_approved)}</> : null}
                        </p>
                        {d.reason ? <p className="mt-1 text-sm text-primary">📝 {d.reason}</p> : null}
                        {d.comment ? <p className="mt-1 text-sm text-muted-foreground">💬 {d.comment}</p> : null}
                    </li>
                );
            })}
        </ul>
    );
}

/** Alias prompt — panneau historique. */
export { RequestHistoryTimeline as RhRequestHistoryPanel };
