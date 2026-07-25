import type { LucideIcon } from "lucide-react";
import { cx } from "@/utils/cx";

type StatPillProps = {
    icon: LucideIcon;
    label: string;
    value: string | number;
};

export function StatPill({ icon: Icon, label, value }: StatPillProps) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-primary-600 shadow-sm dark:bg-slate-900 dark:text-primary-400">
                <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
            </div>
        </div>
    );
}

export function StatPillSkeleton() {
    return <div className="h-[3.25rem] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;
}
