import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useExecuteArbitrage } from "@/hooks/useProjects";
import { useToast } from "@/providers/toast-provider";
import type { DashboardArbitrageOption, StrategistSummary } from "@/features/manager/types/dashboard-v3";
import { managerProjectMissionControlPath } from "@/utils/workspace-routes";
import { blocCardClass, confidencePct, pickAllowlistedImpacts } from "../dashboard-v3-ui";

type ArbitrageOptionsBlocProps = {
    summary: StrategistSummary;
    options: DashboardArbitrageOption[];
    optionTypes: Array<{ type: string; label: string; description: string }>;
    enterpriseId: string;
    onChanged: () => Promise<void>;
};

export function ArbitrageOptionsBloc({
    summary,
    options,
    optionTypes,
    enterpriseId,
    onChanged,
}: ArbitrageOptionsBlocProps) {
    const { t } = useTranslation("common");
    const tb = (key: string, opts?: Record<string, unknown>) =>
        String(opts ? t(`managerWorkspace.dashboard.bloc3.${key}`, opts as never) : t(`managerWorkspace.dashboard.bloc3.${key}`));
    const { push } = useToast();
    const execute = useExecuteArbitrage();
    const [pending, setPending] = useState<{ opt: DashboardArbitrageOption; action: "execute" | "reject" } | null>(null);

    const proposed = options.filter((o) => o.status === "proposed");
    const typeLabel = (type: string) => {
        const fromApi = optionTypes.find((o) => o.type === type);
        if (fromApi?.label) return fromApi.label;
        return t(`managerWorkspace.dashboard.bloc3.optionTypes.${type}`, { defaultValue: type });
    };

    const runAction = (opt: DashboardArbitrageOption, action: "execute" | "reject") => {
        if (!enterpriseId) return;
        execute.mutate(
            { option_id: opt.id, enterprise_id: enterpriseId, action },
            {
                onSuccess: async () => {
                    push(action === "execute" ? tb("acceptedToast") : tb("rejectedToast"), "success");
                    setPending(null);
                    await onChanged();
                },
                onError: () => push(tb("errorToast"), "error"),
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

    return (
        <section className={blocCardClass()} id="dashboard-strategist">
            <header className="mb-4">
                <h3 className="text-base font-semibold text-ws-primary">{tb("title")}</h3>
                <p className="mt-0.5 text-sm text-ws-muted">{tb("subtitle")}</p>
            </header>

            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                    [
                        { key: "reallocation", count: summary.by_type.reallocation },
                        { key: "delay", count: summary.by_type.delay },
                        { key: "reinforce", count: summary.by_type.reinforce },
                        { key: "stop_scope", count: summary.by_type.stop_scope },
                    ] as const
                ).map((pill) => (
                    <div key={pill.key} className="rounded-lg bg-ws-muted-surface py-2 text-center">
                        <p className="text-lg font-bold tabular-nums text-ws-primary">{pill.count}</p>
                        <p className="text-[10px] text-ws-muted">{typeLabel(pill.key)}</p>
                    </div>
                ))}
            </div>

            <div className="mb-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-[color:var(--ws-accent-muted)] px-2.5 py-1 font-medium text-[color:var(--ws-accent)]">
                    {tb("proposedCount", { count: summary.proposed })}
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">
                    {tb("executedCount", { count: summary.executed })}
                </span>
                <span className="rounded-full bg-ws-muted-surface px-2.5 py-1 font-medium text-ws-muted">
                    rejetés {summary.rejected} · conf. {confidencePct(summary.avg_confidence)}%
                </span>
            </div>

            {proposed.length === 0 ? (
                <p className="text-sm text-ws-muted">{tb("empty")}</p>
            ) : (
                <ul className="space-y-3">
                    {proposed.map((opt) => {
                        const impacts = pickAllowlistedImpacts(opt.impact_json);
                        return (
                            <li key={opt.id} className="rounded-lg border border-[color:var(--ws-border)] p-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <Link
                                            to={managerProjectMissionControlPath(opt.project_id)}
                                            className="font-medium text-[color:var(--ws-accent)] hover:underline"
                                        >
                                            {opt.project_name}
                                        </Link>
                                        <p className="mt-0.5 text-xs text-[color:var(--ws-accent)]">{typeLabel(opt.option_type)}</p>
                                        <p className="mt-2 line-clamp-2 text-sm text-ws-muted">{opt.rationale}</p>
                                        {opt.trade_off_label ? (
                                            <p className="mt-1 text-xs font-medium text-amber-700">{opt.trade_off_label}</p>
                                        ) : null}
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {opt.user_confirmation_required ? (
                                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                                                    confirmation requise
                                                </span>
                                            ) : null}
                                            {opt.audit_logged ? (
                                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                                                    action auditée
                                                </span>
                                            ) : (
                                                <span className="rounded bg-ws-muted-surface px-1.5 py-0.5 text-[10px] font-medium text-ws-muted">
                                                    hors audit
                                                </span>
                                            )}
                                        </div>
                                        {impacts.length > 0 ? (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {impacts.map((imp) => (
                                                    <span
                                                        key={imp.key}
                                                        className="rounded bg-ws-muted-surface px-1.5 py-0.5 text-[10px] text-ws-muted"
                                                    >
                                                        {imp.key}: {imp.value}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        <Button
                                            type="button"
                                            color="primary"
                                            size="sm"
                                            isDisabled={execute.isPending}
                                            onClick={() => requestAction(opt, "execute")}
                                        >
                                            {tb("executeBtn")}
                                        </Button>
                                        <Button
                                            type="button"
                                            color="tertiary"
                                            size="sm"
                                            isDisabled={execute.isPending}
                                            onClick={() => requestAction(opt, "reject")}
                                        >
                                            {tb("rejectBtn")}
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ws-muted-surface">
                                    <div
                                        className="h-full rounded-full bg-[color:var(--ws-accent)]"
                                        style={{ width: `${Math.min(100, confidencePct(opt.confidence))}%` }}
                                    />
                                </div>
                                <p className="mt-1 text-right text-[10px] tabular-nums text-ws-muted">{confidencePct(opt.confidence)}%</p>
                            </li>
                        );
                    })}
                </ul>
            )}

            <ConfirmDialog
                isOpen={Boolean(pending) && !execute.isPending}
                onOpenChange={(open) => {
                    if (!open) setPending(null);
                }}
                title={pending?.action === "reject" ? "Confirmer le rejet" : tb("confirmTitle")}
                body={
                    <div className="space-y-2 text-sm">
                        {pending?.opt.trade_off_label ? <p className="font-medium">{pending.opt.trade_off_label}</p> : null}
                        <p>{pending?.action === "reject" ? "Cette action sera journalisée si l’audit est actif." : tb("confirmBody")}</p>
                        {pending?.opt.audit_logged ? <p className="text-xs text-ws-muted">Action auditée.</p> : null}
                    </div>
                }
                confirmLabel={pending?.action === "reject" ? tb("rejectBtn") : tb("executeBtn")}
                cancelLabel={t("common.cancel", "Annuler")}
                onConfirm={() => pending && runAction(pending.opt, pending.action)}
            />
        </section>
    );
}
