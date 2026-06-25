import { HelpCircle } from "@untitledui/icons";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { DASHBOARD_CARD_CLASS } from "@/features/manager/lib/dashboard-display";
import type { DashboardResponse } from "@/features/manager/types/dashboard";
import { cx } from "@/utils/cx";

function KpiCard({
    label,
    main,
    sub,
    segments,
    severity,
    tooltip,
}: {
    label: string;
    main?: string | number;
    sub?: string;
    segments?: Array<{ label: string; value: number; color: "green" | "orange" | "red" }>;
    severity?: "warn" | "ok";
    tooltip?: { title: string; description: string };
}) {
    return (
        <article className={cx(DASHBOARD_CARD_CLASS, "p-3 sm:p-4")}>
            <div className="flex items-center gap-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
                {tooltip ? (
                    <Tooltip title={tooltip.title} description={tooltip.description} placement="top">
                        <TooltipTrigger aria-label={tooltip.title}>
                            <HelpCircle className="size-3.5 text-quaternary" aria-hidden />
                        </TooltipTrigger>
                    </Tooltip>
                ) : null}
            </div>
            {main != null ? (
                <p
                    className={cx(
                        "mt-1.5 text-xl font-bold tabular-nums tracking-tight",
                        severity === "warn" ? "text-orange-700" : "text-primary",
                    )}
                >
                    {main}
                </p>
            ) : null}
            {segments ? (
                <div className="mt-2 space-y-0.5">
                    {segments.map((segment) => (
                        <div key={segment.label} className="flex items-center justify-between text-[11px]">
                            <span className="text-tertiary">{segment.label}</span>
                            <span
                                className={cx(
                                    "font-semibold tabular-nums",
                                    segment.color === "green" && "text-green-600",
                                    segment.color === "orange" && "text-orange-600",
                                    segment.color === "red" && "text-red-600",
                                )}
                            >
                                {segment.value}
                            </span>
                        </div>
                    ))}
                </div>
            ) : null}
            {sub ? <p className="mt-1.5 text-[11px] text-tertiary">{sub}</p> : null}
        </article>
    );
}

export function KpiCardsRow({ kpi_cards }: { kpi_cards: DashboardResponse["kpi_cards"] }) {
    const k = kpi_cards;
    return (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <KpiCard label="Projets" main={k.projects.total} sub={`${k.projects.active} actifs · ${k.projects.planned} planifiés`} />
            <KpiCard
                label="Décisions IA"
                tooltip={{
                    title: "État des projets",
                    description: `Répartition des ${k.projects.total} projets selon leur dernière décision IA.`,
                }}
                segments={[
                    { label: "Poursuivre", value: k.decisions.continue, color: "green" },
                    { label: "Ajuster", value: k.decisions.adjust, color: "orange" },
                    { label: "Arrêter", value: k.decisions.stop, color: "red" },
                ]}
            />
            <KpiCard
                label="Alertes"
                main={k.alerts.total_open}
                sub={`${k.alerts.critical_or_high} critiques/élevées`}
                severity={k.alerts.critical_or_high > 0 ? "warn" : "ok"}
            />
            <KpiCard
                label="Équipe"
                main={k.team.size}
                sub={`${k.team.overloaded} surchargés · ${k.team.contract_ending_soon} fin < 90j`}
            />
            <KpiCard label="Validations" main={k.pending_rh_actions} sub={`${k.unread_notifications} notifs non lues`} />
        </section>
    );
}
