import type { ProjectRisksPayload } from "@/hooks/use-project";
import { AlertCircle } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";

export interface RiskIndicatorsPanelProps {
    risks: ProjectRisksPayload | null;
    className?: string;
}

export function RiskIndicatorsPanel({ risks, className }: RiskIndicatorsPanelProps) {
    if (!risks) return null;

    const fragility = risks.fragility_score ?? 0;
    const anxiety = risks.anxiety_pulse ?? 0;
    const alerts = risks.alerts ?? [];

    return (
        <section className={cx("rounded-xl border border-secondary bg-primary p-5 shadow-xs md:p-6", className)}>
            <div className="flex items-center gap-2">
                <AlertCircle className="size-5 text-fg-secondary" />
                <h2 className="text-lg font-semibold text-primary">Risques et signaux faibles</h2>
            </div>
            <p className="mt-1 text-sm text-tertiary">Fragility Score (BANI), Anxiety Pulse, alertes.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-secondary p-4">
                    <p className="text-sm font-medium text-tertiary">Fragility Score</p>
                    <p
                        className={cx(
                            "mt-1 text-md font-semibold",
                            fragility >= 7 ? "text-error-primary" : fragility >= 4 ? "text-warning-primary" : "text-success-primary",
                        )}
                    >
                        {fragility.toFixed(1)} / 10
                    </p>
                </div>
                <div className="rounded-lg bg-secondary p-4">
                    <p className="text-sm font-medium text-tertiary">Anxiety Pulse</p>
                    <p className="mt-1 text-md font-semibold text-primary">{anxiety.toFixed(1)}</p>
                </div>
            </div>

            {alerts.length > 0 && (
                <div className="mt-6">
                    <p className="text-sm font-medium text-secondary">Alertes</p>
                    <ul className="mt-2 space-y-2">
                        {alerts.map((alert, i) => (
                            <li key={i} className="flex items-start gap-2 rounded-lg border border-secondary p-3">
                                <Badge type="pill-color" size="sm" color={alert.severity === "high" ? "error" : "warning"}>
                                    {alert.type}
                                </Badge>
                                <span className="text-sm text-tertiary">{alert.description}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
