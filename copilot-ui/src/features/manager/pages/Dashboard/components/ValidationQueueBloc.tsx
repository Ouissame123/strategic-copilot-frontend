import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { ValidationConflictItem, ValidationQueue, ValidationQueueItem } from "@/features/manager/types/dashboard-v3";
import { WORKSPACE_PREFIX } from "@/utils/workspace-routes";
import { blocCardClass } from "../dashboard-v3-ui";

type ValidationQueueBlocProps = {
    queue: ValidationQueue;
};

function ConflictRows({ items, slaOverdueLabel }: { items: ValidationConflictItem[]; slaOverdueLabel: string }) {
    return (
        <ul className="space-y-2">
            {items.slice(0, 3).map((item) => (
                <li key={item.id} className="rounded-md border border-[color:var(--ws-border)] bg-ws-card/80 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ws-primary">{item.title}</span>
                        {item.sla_overdue ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">{slaOverdueLabel}</span>
                        ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-ws-muted">
                        {item.talent_name}
                        {item.conflicting_project ? ` · ${item.conflicting_project}` : ""} · {item.age_days}j
                    </p>
                    <p className="mt-1 text-sm text-ws-muted">{item.why_explanation}</p>
                </li>
            ))}
        </ul>
    );
}

function QueueRows({ items }: { items: ValidationQueueItem[] }) {
    return (
        <ul className="space-y-2">
            {items.slice(0, 3).map((item) => (
                <li key={item.id} className="rounded-md border border-[color:var(--ws-border)] bg-ws-card/80 px-3 py-2">
                    <span className="text-sm font-medium text-ws-primary">{item.title}</span>
                    <p className="mt-0.5 text-xs text-ws-muted">
                        {item.talent_name} · {item.age_days}j
                    </p>
                    <p className="mt-1 text-sm text-ws-muted">{item.why_explanation}</p>
                </li>
            ))}
        </ul>
    );
}

export function ValidationQueueBloc({ queue }: ValidationQueueBlocProps) {
    const { t } = useTranslation("common");
    const tb = (key: string) => t(`managerWorkspace.dashboard.bloc4.${key}`);
    const s = queue.summary;
    const hasItems = queue.conflicts.length + queue.missing_justif.length + queue.standard_queue.length > 0;
    const rules = [...queue.priority_rules].sort((a, b) => a.order - b.order);

    return (
        <section className={blocCardClass()} id="dashboard-helper">
            <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 className="text-base font-semibold text-ws-primary">{tb("title")}</h3>
                    <p className="mt-0.5 text-sm text-ws-muted">{tb("subtitle")}</p>
                </div>
                <Link to={`${WORKSPACE_PREFIX.manager}/validations`} className="text-xs font-medium text-[color:var(--ws-accent)] hover:underline">
                    File complète →
                </Link>
            </header>

            <div className="mb-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-800">conflits {s.conflicts}</span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">justifs {s.missing_justif}</span>
                <span className="rounded-full bg-ws-muted-surface px-2.5 py-1 font-medium text-ws-muted">standard {s.standard_queue}</span>
                <span className="rounded-full bg-ws-muted-surface px-2.5 py-1 font-medium text-ws-muted">pending {s.total_pending}</span>
                {s.sla_overdue > 0 ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-800">SLA {s.sla_overdue}</span>
                ) : null}
                {s.urgent_count > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">urgent {s.urgent_count}</span>
                ) : null}
            </div>
            <p className="mb-3 text-[11px] text-ws-muted">Âge moyen {s.avg_age_days.toFixed(1)} j</p>

            {rules.length > 0 ? (
                <div className="mb-4 rounded-lg border border-[color:var(--ws-border)] bg-ws-muted-surface/50 p-2">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ws-muted">Règles de priorité</p>
                    <ol className="space-y-1">
                        {rules.map((r) => (
                            <li key={`${r.order}-${r.rule}`} className="text-[11px] text-ws-muted">
                                <span className="font-semibold text-ws-primary">
                                    {r.order}. {r.label}
                                </span>
                                {r.description ? ` — ${r.description}` : ""}
                            </li>
                        ))}
                    </ol>
                </div>
            ) : null}

            {!hasItems ? (
                <p className="text-sm text-ws-muted">{tb("empty")}</p>
            ) : (
                <div className="space-y-3">
                    {queue.conflicts.length > 0 ? (
                        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/20">
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ws-muted">{tb("buckets.conflict")}</h4>
                            <ConflictRows items={queue.conflicts} slaOverdueLabel={tb("slaOverdue")} />
                        </div>
                    ) : null}
                    {queue.missing_justif.length > 0 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ws-muted">{tb("buckets.missing")}</h4>
                            <QueueRows items={queue.missing_justif} />
                        </div>
                    ) : null}
                    {queue.standard_queue.length > 0 ? (
                        <div className="rounded-lg border border-[color:var(--ws-border)] bg-ws-muted-surface/40 p-3">
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ws-muted">{tb("buckets.standard")}</h4>
                            <QueueRows items={queue.standard_queue} />
                        </div>
                    ) : null}
                </div>
            )}
        </section>
    );
}
