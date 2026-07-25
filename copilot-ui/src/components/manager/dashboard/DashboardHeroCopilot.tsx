import { Link } from "react-router";
import { ChevronRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";

export type CopilotPriorityLine = { key: string; label: string; href: string };

type DashboardHeroCopilotProps = {
    headline: string;
    priorities: CopilotPriorityLine[];
};

export function DashboardHeroCopilot({ headline, priorities }: DashboardHeroCopilotProps) {
    const { t } = useTranslation("common");
    const lines = priorities.slice(0, 6);

    return (
        <section
            className={cx(
                "overflow-hidden p-5",
                "rounded-3xl",
                "bg-gradient-to-br from-primary-50 via-primary-50 to-primary-50",
                "dark:from-primary-950/40 dark:via-primary-950/30 dark:to-primary-950/40",
                "backdrop-blur-xl",
                "border border-primary-200/60 dark:border-primary-700/40",
                "shadow-lg shadow-primary-200/40 dark:shadow-primary-900/20",
            )}
        >
            <div className="flex gap-4">
                <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 shadow-sm dark:bg-primary-900/40 dark:text-primary-300"
                    aria-hidden
                >
                    <Sparkles className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
                        {t("managerWorkspace.dashboard.copilotHeroBadge")}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300 md:text-base">{headline}</p>

                    {lines.length > 0 ? (
                        <ul className="mt-4 space-y-1.5" role="list">
                            {lines.map((line, index) => (
                                <li key={line.key}>
                                    <Link
                                        to={line.href}
                                        className={cx(
                                            "group flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium text-slate-800 transition-all duration-200",
                                            "border-primary-100 bg-white/70",
                                            "hover:bg-primary-50",
                                            "dark:border-primary-800/40 dark:bg-slate-900/30 dark:text-slate-100",
                                            "dark:hover:bg-primary-900/20",
                                        )}
                                    >
                                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-600/15 text-[10px] font-bold tabular-nums text-primary-800 dark:bg-primary-400/20 dark:text-primary-200">
                                            {index + 1}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">{line.label}</span>
                                        <ChevronRight
                                            className="size-4 shrink-0 text-primary-600/70 opacity-70 transition group-hover:translate-x-0.5 group-hover:text-primary-600 group-hover:opacity-100 dark:text-primary-400"
                                            aria-hidden
                                        />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                            {t("managerWorkspace.dashboard.copilotHeroNoActions")}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
