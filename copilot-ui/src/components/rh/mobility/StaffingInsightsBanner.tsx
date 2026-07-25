import { Lightbulb } from "lucide-react";
import type { StaffingInsight } from "@/lib/rh-assignments-display";
import { RH_TEXT_MUTED, RH_TEXT_SECONDARY } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

const DOT_CLS: Record<StaffingInsight["tone"], string> = {
    danger: "bg-rose-500",
    warn: "bg-amber-400",
    info: "bg-primary-400",
    success: "bg-emerald-500",
};

export function StaffingInsightsBanner({ insights }: { insights: StaffingInsight[] }) {
    if (!insights.length) return null;

    return (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2 px-0.5 py-1">
            <div className="flex items-center gap-1.5 shrink-0">
                <Lightbulb size={13} className="text-slate-400" aria-hidden />
                <span className={cx("text-[11px] font-semibold uppercase tracking-wide", RH_TEXT_MUTED)}>
                    Insights opérationnels RH
                </span>
            </div>
            <ul className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-1.5">
                {insights.map((item) => (
                    <li key={item.id} className="flex max-w-full items-start gap-2">
                        <span className={cx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", DOT_CLS[item.tone])} aria-hidden />
                        <span className={cx("text-xs leading-snug", RH_TEXT_SECONDARY)}>{item.message}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
