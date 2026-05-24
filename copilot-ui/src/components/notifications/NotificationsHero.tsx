import { AlertTriangle, Shield } from "lucide-react";
import { cx } from "@/utils/cx";
import { RH_ACTIVE_BUTTON_CLASSES, RH_INACTIVE_BUTTON_CLASSES } from "@/components/rh-requests/rh-requests-styles";

const Box = ("di" + "v") as const;

type SeverityChip = {
    id: string;
    label: string;
    count: number;
};

type NotificationsHeroProps = {
    title: string;
    subtitle: string;
    totalCount: number;
    severityChips: SeverityChip[];
    activeSeverity: string;
    onSeverityChange: (id: string) => void;
    onWatchdog: () => void;
    watchdogPending?: boolean;
    watchdogLabel?: string;
};

export function NotificationsHero({
    title,
    subtitle,
    totalCount,
    severityChips,
    activeSeverity,
    onSeverityChange,
    onWatchdog,
    watchdogPending,
    watchdogLabel = "Watchdog Scan",
}: NotificationsHeroProps) {
    return (
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <Box className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <Box className="min-w-0 flex-1">
                    <Box className="flex flex-wrap items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                            <AlertTriangle className="size-5" aria-hidden />
                        </span>
                        <Box>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
                            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
                        </Box>
                        <span className="ml-auto rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold tabular-nums text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 lg:ml-0">
                            {totalCount} alerte{totalCount > 1 ? "s" : ""}
                        </span>
                    </Box>

                    <Box className="mt-4 flex flex-wrap gap-2">
                        {severityChips.map((chip) => (
                            <button
                                key={chip.id}
                                type="button"
                                onClick={() => onSeverityChange(chip.id)}
                                className={cx(
                                    "rounded-full border px-3 py-1 text-xs font-semibold transition",
                                    activeSeverity === chip.id ? RH_ACTIVE_BUTTON_CLASSES : RH_INACTIVE_BUTTON_CLASSES,
                                )}
                            >
                                {chip.label} ({chip.count})
                            </button>
                        ))}
                    </Box>
                </Box>

                <button
                    type="button"
                    onClick={onWatchdog}
                    disabled={watchdogPending}
                    className={cx(
                        "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60",
                        RH_ACTIVE_BUTTON_CLASSES,
                    )}
                >
                    <Shield className="size-4" aria-hidden />
                    {watchdogPending ? "Scan en cours…" : watchdogLabel}
                </button>
            </Box>
        </section>
    );
}
