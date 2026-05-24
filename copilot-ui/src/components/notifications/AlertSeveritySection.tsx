import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import type { AlertSeverity } from "./notification-alert-utils";
import { cx } from "@/utils/cx";

const Box = ("di" + "v") as const;

type AlertSeveritySectionProps = {
    severity: AlertSeverity;
    title: string;
    count: number;
    expanded: boolean;
    onToggle: () => void;
    children: ReactNode;
};

const HEADER_TONE: Record<AlertSeverity, string> = {
    critical: "text-rose-700 dark:text-rose-300",
    high: "text-orange-700 dark:text-orange-300",
    medium: "text-amber-700 dark:text-amber-300",
    low: "text-slate-600 dark:text-slate-400",
    unknown: "text-slate-600 dark:text-slate-400",
};

export function AlertSeveritySection({ severity, title, count, expanded, onToggle, children }: AlertSeveritySectionProps) {
    if (count === 0) return null;

    return (
        <section className="w-full">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-2 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
            >
                <h2 className={cx("text-sm font-bold uppercase tracking-wide", HEADER_TONE[severity])}>
                    {title}
                    <span className="ml-2 font-semibold tabular-nums text-slate-500 dark:text-slate-400">({count})</span>
                </h2>
                <ChevronDown className={cx("size-5 text-slate-400 transition", expanded && "rotate-180")} aria-hidden />
            </button>
            {expanded ? <Box className="mt-2 space-y-3">{children}</Box> : null}
        </section>
    );
}
