import { Lightbulb02 } from "@untitledui/icons";
import type { DashboardResponse } from "@/features/manager/types/dashboard";

type Props = {
    headline: string;
    priorities: DashboardResponse["priorities"];
    healthLabel: string;
};

export function DashboardInsightStrip({ headline, priorities, healthLabel }: Props) {
    const topPriority = priorities[0]?.label;
    const insight = topPriority?.trim() || headline?.trim();
    if (!insight) return null;

    return (
        <div className="flex items-start gap-2.5 rounded-xl border border-brand-secondary/20 bg-brand-primary/8 px-3.5 py-2.5">
            <Lightbulb02 className="mt-0.5 size-4 shrink-0 text-brand-secondary" aria-hidden />
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-secondary">
                    Insight Copilot · {healthLabel}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-primary">{insight}</p>
            </div>
        </div>
    );
}
