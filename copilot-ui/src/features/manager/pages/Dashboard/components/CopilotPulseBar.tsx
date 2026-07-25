import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { DashboardCopilotPulse, DashboardHealth } from "@/features/manager/types/dashboard-v3";
import { cx } from "@/utils/cx";
import { healthLabelClass, resolvePriorityActionHref, urgencyPanelClass } from "../dashboard-v3-ui";

type CopilotPulseBarProps = {
    pulse: DashboardCopilotPulse;
    health: DashboardHealth;
};

export function CopilotPulseBar({ pulse, health }: CopilotPulseBarProps) {
    const { t } = useTranslation("common");
    const th = (key: string) => t(`managerWorkspace.dashboard.healthLabel.${key}`);
    const actions = [...pulse.priority_actions].sort((a, b) => a.rank - b.rank);

    return (
        <section className={cx("rounded-xl border p-4 sm:p-5", urgencyPanelClass(pulse.urgency))}>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-ws-muted">
                        {t("managerWorkspace.dashboard.copilotPulse")}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold leading-snug text-ws-primary">{pulse.headline}</h2>
                    <p className="mt-1 text-xs text-ws-muted">
                        Viabilité moy. {health.avg_viability.toFixed(1)}/10 · urgence {pulse.urgency}
                    </p>
                    {actions.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {actions.map((action) => {
                                const href = resolvePriorityActionHref(action.action);
                                const content = (
                                    <>
                                        <span aria-hidden>{action.icon}</span>
                                        {action.label}
                                    </>
                                );
                                return href ? (
                                    <Link
                                        key={`${action.rank}-${action.label}`}
                                        to={href}
                                        className="inline-flex items-center gap-1 rounded-full bg-ws-card/80 px-2.5 py-1 text-xs font-medium text-[color:var(--ws-accent)] ring-1 ring-[color:var(--ws-border)] hover:underline"
                                    >
                                        {content}
                                    </Link>
                                ) : (
                                    <span
                                        key={`${action.rank}-${action.label}`}
                                        className="inline-flex items-center gap-1 rounded-full bg-ws-card/80 px-2.5 py-1 text-xs font-medium text-ws-primary ring-1 ring-[color:var(--ws-border)]"
                                        title={action.action || undefined}
                                    >
                                        {content}
                                    </span>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
                <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-[color:var(--ws-border)] bg-ws-card text-center">
                    <span className={cx("text-2xl font-bold tabular-nums", healthLabelClass(health.label))}>
                        {health.score.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-medium text-ws-muted">{th(health.label)}</span>
                </div>
            </div>
        </section>
    );
}
