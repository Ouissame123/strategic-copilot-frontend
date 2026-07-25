import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ConfidenceSegment } from "@/components/ui/ScoreBar";
import { useExecuteArbitrage } from "@/hooks/useProjects";
import { useToast } from "@/providers/toast-provider";
import type {
    DashboardArbitrageOption,
    ValidationConflictItem,
    ValidationQueue,
    ValidationQueueItem,
} from "@/features/manager/types/dashboard-v3";
import { WORKSPACE_PREFIX } from "@/utils/workspace-routes";
import { confidencePct } from "../dashboard-v3-ui";
import { labelArbitrageType } from "../lib/labels";
import { StatusBadge } from "./StatusBadge";
import { cx } from "@/utils/cx";

type InboxFilter = "all" | "conflicts" | "missing" | "standard" | "arbitrage";

type InboxItem =
    | {
          kind: "validation";
          bucket: "conflicts" | "missing" | "standard";
          id: string;
          title: string;
          subtitle: string;
          rationale: string;
          sort: number;
      }
    | {
          kind: "arbitrage";
          id: string;
          option: DashboardArbitrageOption;
          sort: number;
      };

type ActionInboxProps = {
    queue: ValidationQueue;
    options: DashboardArbitrageOption[];
    optionTypes: Array<{ type: string; label: string; description: string }>;
    enterpriseId: string;
    onChanged: () => Promise<void>;
    refreshing?: boolean;
};

function validationItem(
    bucket: "conflicts" | "missing" | "standard",
    item: ValidationConflictItem | ValidationQueueItem,
    baseSort: number,
): InboxItem {
    const conflict = "conflicting_project" in item ? item.conflicting_project : "";
    return {
        kind: "validation",
        bucket,
        id: `v-${bucket}-${item.id}`,
        title: item.title,
        subtitle: [item.talent_name, conflict, `${item.age_days} j`]
            .filter(Boolean)
            .join(" · "),
        rationale: item.why_explanation,
        sort: baseSort + (100 - (item.priority_score || 0)),
    };
}

export function ActionInbox({
    queue,
    options,
    optionTypes,
    enterpriseId,
    onChanged,
    refreshing,
}: ActionInboxProps) {
    const { push } = useToast();
    const execute = useExecuteArbitrage();
    const [filter, setFilter] = useState<InboxFilter>("all");
    const [pending, setPending] = useState<{ opt: DashboardArbitrageOption; action: "execute" | "reject" } | null>(
        null,
    );
    const [busyId, setBusyId] = useState<string | null>(null);

    const typeLabel = (type: string) => {
        const fromApi = optionTypes.find((o) => o.type === type)?.label?.trim();
        return fromApi || labelArbitrageType(type);
    };

    const arbitrageTooltip = (opt: DashboardArbitrageOption): string => {
        const drivers = opt.impact_json?.key_drivers;
        if (Array.isArray(drivers) && drivers.length > 0) {
            return drivers.map((d) => String(d)).join(" · ");
        }
        return opt.rationale;
    };

    const items = useMemo(() => {
        const list: InboxItem[] = [];
        for (const item of queue.conflicts) list.push(validationItem("conflicts", item, 0));
        for (const item of queue.missing_justif) list.push(validationItem("missing", item, 1000));
        for (const item of queue.standard_queue) list.push(validationItem("standard", item, 2000));
        for (const opt of options.filter((o) => o.status === "proposed")) {
            list.push({
                kind: "arbitrage",
                id: `a-${opt.id}`,
                option: opt,
                sort: 3000 + (100 - confidencePct(opt.confidence)),
            });
        }
        return list.sort((a, b) => a.sort - b.sort);
    }, [options, queue]);

    const filtered = items.filter((item) => {
        if (filter === "all") return true;
        if (filter === "arbitrage") return item.kind === "arbitrage";
        return item.kind === "validation" && item.bucket === filter;
    });

    const runAction = (opt: DashboardArbitrageOption, action: "execute" | "reject") => {
        if (!enterpriseId) return;
        setBusyId(opt.id);
        execute.mutate(
            { option_id: opt.id, enterprise_id: enterpriseId, action },
            {
                onSuccess: async () => {
                    push(action === "execute" ? "Option appliquée" : "Option rejetée", "success");
                    setPending(null);
                    await onChanged();
                },
                onError: () => push("Impossible de traiter cette option", "error"),
                onSettled: () => setBusyId(null),
            },
        );
    };

    const requestAction = (opt: DashboardArbitrageOption, action: "execute" | "reject") => {
        const needsConfirm = action === "execute" ? opt.user_confirmation_required !== false : opt.audit_logged;
        if (needsConfirm) {
            setPending({ opt, action });
            return;
        }
        runAction(opt, action);
    };

    const filters: Array<{ id: InboxFilter; label: string; count: number }> = [
        { id: "all", label: "Tout", count: items.length },
        { id: "conflicts", label: "Conflits", count: queue.conflicts.length },
        { id: "missing", label: "Justifications", count: queue.missing_justif.length },
        { id: "standard", label: "File", count: queue.standard_queue.length },
        { id: "arbitrage", label: "Arbitrages", count: options.filter((o) => o.status === "proposed").length },
    ];

    return (
        <aside
            className={cx(
                "flex h-full min-h-0 flex-col border-l border-[color:var(--border)] bg-[color:var(--surface-1)]",
                refreshing && "opacity-90",
            )}
        >
            <header className="shrink-0 border-b border-[color:var(--border)] px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[13px] font-semibold text-[color:var(--text)]">Actions à traiter</h2>
                    <StatusBadge variant="ai">
                        <span className="font-ops-data">{items.length}</span>
                    </StatusBadge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                    {filters.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilter(f.id)}
                            className={cx(
                                "ops-focus-ring rounded-full px-2 py-0.5 text-[11px] font-medium",
                                filter === f.id
                                    ? "bg-[color:var(--accent)] text-white shadow-[0_0_12px_var(--accent-glow)]"
                                    : "bg-[color:var(--surface-2)] text-[color:var(--text-muted)] hover:text-[color:var(--text)]",
                            )}
                        >
                            {f.label} <span className="font-ops-data">{f.count}</span>
                        </button>
                    ))}
                </div>
            </header>

            <div className="ops-scroll min-h-0 flex-1 overflow-y-auto p-3">
                {filtered.length === 0 ? (
                    <div className="rounded-[10px] border border-dashed border-[color:var(--border)] px-3 py-8 text-center text-[13px] text-[color:var(--text-muted)]">
                        Aucune action en attente.
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {filtered.map((item) =>
                            item.kind === "validation" ? (
                                <li
                                    key={item.id}
                                    data-agent="helper"
                                    className="ops-card ops-card-interactive ops-agent-rail-left p-3"
                                    title={item.rationale}
                                >
                                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                        <StatusBadge variant="ai">Assistant</StatusBadge>
                                        <StatusBadge
                                            variant={
                                                item.bucket === "conflicts"
                                                    ? "critical"
                                                    : item.bucket === "missing"
                                                      ? "warning"
                                                      : "neutral"
                                            }
                                        >
                                            {item.bucket === "conflicts"
                                                ? "Conflit"
                                                : item.bucket === "missing"
                                                  ? "Justification"
                                                  : "Validation"}
                                        </StatusBadge>
                                    </div>
                                    <p className="text-[13px] font-medium text-[color:var(--text)]">{item.title}</p>
                                    <p className="font-ops-data mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                                        {item.subtitle}
                                    </p>
                                    <p className="mt-1 line-clamp-1 text-[12px] text-[color:var(--text-muted)]">
                                        {item.rationale}
                                    </p>
                                    <Link
                                        to={`${WORKSPACE_PREFIX.manager}/validations`}
                                        className="ops-focus-ring mt-2 inline-flex text-[12px] font-medium text-[color:var(--accent)] hover:underline"
                                    >
                                        Ouvrir →
                                    </Link>
                                </li>
                            ) : (
                                <li
                                    key={item.id}
                                    data-agent="strategist"
                                    className="ops-card ops-card-interactive ops-agent-rail-left p-3"
                                    title={arbitrageTooltip(item.option)}
                                >
                                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                        <StatusBadge variant="ai">Stratège</StatusBadge>
                                        <StatusBadge variant="warning">{typeLabel(item.option.option_type)}</StatusBadge>
                                    </div>
                                    <p className="text-[13px] font-medium text-[color:var(--text)]">
                                        {item.option.project_name}
                                    </p>
                                    <p className="mt-1 line-clamp-1 text-[12px] text-[color:var(--text-muted)]">
                                        {item.option.rationale}
                                    </p>
                                    <ConfidenceSegment
                                        confidence={item.option.confidence}
                                        className="mt-2"
                                        colorVar="var(--agent-strategist)"
                                    />
                                    <div className="mt-2 flex gap-1">
                                        <Button
                                            type="button"
                                            color="primary"
                                            size="sm"
                                            isDisabled={busyId === item.option.id || execute.isPending}
                                            isLoading={busyId === item.option.id && execute.isPending}
                                            onClick={() => requestAction(item.option, "execute")}
                                            className="ops-focus-ring"
                                        >
                                            Appliquer
                                        </Button>
                                        <Button
                                            type="button"
                                            color="tertiary"
                                            size="sm"
                                            isDisabled={busyId === item.option.id || execute.isPending}
                                            onClick={() => requestAction(item.option, "reject")}
                                            className="ops-focus-ring"
                                        >
                                            Rejeter
                                        </Button>
                                    </div>
                                </li>
                            ),
                        )}
                    </ul>
                )}
            </div>

            <ConfirmDialog
                isOpen={Boolean(pending) && !execute.isPending}
                onOpenChange={(open) => {
                    if (!open) setPending(null);
                }}
                title={pending?.action === "reject" ? "Confirmer le rejet" : "Confirmer l'application"}
                body={
                    <div className="space-y-2 text-[13px]">
                        {pending?.opt.trade_off_label ? <p className="font-medium">{pending.opt.trade_off_label}</p> : null}
                        <p>
                            {pending?.action === "reject"
                                ? "Cette action sera journalisée si l'audit est actif."
                                : "Confirmez l'application de cette option d'arbitrage."}
                        </p>
                    </div>
                }
                confirmLabel={pending?.action === "reject" ? "Rejeter" : "Appliquer"}
                cancelLabel="Annuler"
                onConfirm={() => pending && runAction(pending.opt, pending.action)}
            />
        </aside>
    );
}
