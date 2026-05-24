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
                "bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50",
                "dark:from-violet-950/40 dark:via-purple-950/30 dark:to-indigo-950/40",
                "backdrop-blur-xl",
                "border border-violet-200/60 dark:border-violet-700/40",
                "shadow-lg shadow-violet-200/40 dark:shadow-violet-900/20",
            )}
        >
            <div className="flex gap-4">
                <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 shadow-sm dark:bg-violet-900/40 dark:text-violet-300"
                    aria-hidden
                >
                    <Sparkles className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
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
                                            "border-violet-100 bg-white/70",
                                            "hover:bg-violet-50",
                                            "dark:border-violet-800/40 dark:bg-slate-900/30 dark:text-slate-100",
                                            "dark:hover:bg-violet-900/20",
                                        )}
                                    >
                                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-600/15 text-[10px] font-bold tabular-nums text-violet-800 dark:bg-violet-400/20 dark:text-violet-200">
                                            {index + 1}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">{line.label}</span>
                                        <ChevronRight
                                            className="size-4 shrink-0 text-violet-600/70 opacity-70 transition group-hover:translate-x-0.5 group-hover:text-violet-600 group-hover:opacity-100 dark:text-violet-400"
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
