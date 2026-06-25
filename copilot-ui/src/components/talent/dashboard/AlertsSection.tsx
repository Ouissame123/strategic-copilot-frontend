import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import type { TalentDashboard } from "@/types/talent-dashboard";
import { TALENT_SURFACE } from "@/components/talent/ui/talent-workspace-ui";
import { SEVERITY_TONES, toneClasses } from "./talent-dashboard-tones";
import type { TalentDashboardDensity } from "./use-talent-dashboard-density";
import { cx } from "@/utils/cx";

type AlertsSectionProps = {
    alerts?: TalentDashboard["alerts"];
    contractAlert?: TalentDashboard["contract_alert"];
    density: TalentDashboardDensity;
    defaultExpanded?: boolean;
};

export function AlertsSection({ alerts, contractAlert, density, defaultExpanded = false }: AlertsSectionProps) {
    const list = alerts ?? [];
    const hasContract = contractAlert != null;
    if (list.length === 0 && !hasContract) return null;

    const compact = density === "compact";
    const sorted = [...list].sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
    });
    const totalCount = sorted.length + (hasContract ? 1 : 0);
    const hasUrgent =
        (hasContract && contractAlert.severity === "high") ||
        sorted.some((a) => a.severity === "critical" || a.severity === "high");

    const [expanded, setExpanded] = useState(defaultExpanded || hasUrgent);

    return (
        <section className={cx(TALENT_SURFACE, "border-l-[3px] border-l-amber-500")}>
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-secondary_subtle/30 sm:px-4"
                aria-expanded={expanded}
            >
                <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-300">
                        <AlertTriangle className="size-3.5" aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-primary">
                        Alertes
                        <span className="ml-1.5 text-xs font-medium tabular-nums text-tertiary">({totalCount})</span>
                    </span>
                </div>
                <ChevronDown
                    className={cx("size-4 shrink-0 text-tertiary transition-transform", expanded && "rotate-180")}
                    aria-hidden
                />
            </button>

            {expanded ? (
                <ul className={cx("space-y-1 border-t border-secondary/40 px-3 pb-3 pt-2 sm:px-4", compact && "pb-2")}>
                    {hasContract ? (
                        <li>
                            <article
                                className={cx(
                                    "flex items-start gap-2 rounded-md border px-2.5 py-1.5",
                                    contractAlert.severity === "high"
                                        ? toneClasses("red").badge
                                        : toneClasses("amber").badge,
                                )}
                            >
                                <ChevronRight className="mt-0.5 size-3 shrink-0 opacity-60" aria-hidden />
                                <p className="min-w-0 flex-1 text-xs font-medium">{contractAlert.message}</p>
                            </article>
                        </li>
                    ) : null}
                    {sorted.map((alert) => {
                        const tone = SEVERITY_TONES[alert.severity] ?? "slate";
                        const cls = toneClasses(tone);
                        return (
                            <li key={alert.id}>
                                <article className={cx("flex items-start gap-2 rounded-md border px-2.5 py-1.5", cls.badge)}>
                                    <ChevronRight className="mt-0.5 size-3 shrink-0 opacity-60" aria-hidden />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1">
                                            <span className="text-[10px] font-semibold uppercase">{alert.severity_label}</span>
                                            {alert.impact_area ? (
                                                <span className="text-[10px] text-tertiary">· {alert.impact_area}</span>
                                            ) : null}
                                        </div>
                                        <p className="mt-0.5 text-xs font-medium text-primary">{alert.message}</p>
                                    </div>
                                </article>
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </section>
    );
}
