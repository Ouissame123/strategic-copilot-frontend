import { AlertTriangle, CheckCircle2, Minus } from "lucide-react";
import { cx } from "@/utils/cx";

type ImpactBannerProps = {
    delta: number;
    impactExplained: string;
    scenarioSummary: string;
};

export function ImpactBanner({ delta, impactExplained, scenarioSummary }: ImpactBannerProps) {
    const variant = delta > 0.3 ? "positive" : delta < -0.3 ? "negative" : "neutral";

    const config = {
        positive: {
            Icon: CheckCircle2,
            color: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100",
        },
        negative: {
            Icon: AlertTriangle,
            color: "border-red-300 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100",
        },
        neutral: {
            Icon: Minus,
            color: "border-sky-300 bg-sky-50 dark:bg-sky-950/30 text-sky-900 dark:text-sky-100",
        },
    }[variant];

    const { Icon, color } = config;

    return (
        <section className={cx("rounded-xl border-2 p-4 shadow-sm", color)} aria-live="polite">
            <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-6 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-80">Scénario simulé</div>
                    <p className="text-sm font-medium">{scenarioSummary}</p>
                    <p className="mt-2 text-sm">{impactExplained}</p>
                </div>
            </div>
        </section>
    );
}
