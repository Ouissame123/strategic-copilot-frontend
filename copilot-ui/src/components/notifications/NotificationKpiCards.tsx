import { AlertTriangle, FolderKanban, TrendingUp, Users } from "lucide-react";
import { cx } from "@/utils/cx";

const Box = ("di" + "v") as const;

type KpiItem = {
    id: string;
    label: string;
    value: number;
    tone?: "critical" | "high" | "neutral";
};

type NotificationKpiCardsProps = {
    items: KpiItem[];
};

const toneClass: Record<NonNullable<KpiItem["tone"]>, string> = {
    critical: "text-rose-600 dark:text-rose-400",
    high: "text-orange-600 dark:text-orange-400",
    neutral: "text-slate-900 dark:text-slate-100",
};

const icons: Record<string, typeof AlertTriangle> = {
    critical: AlertTriangle,
    high: TrendingUp,
    talents: Users,
    projects: FolderKanban,
};

export function NotificationKpiCards({ items }: NotificationKpiCardsProps) {
    return (
        <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => {
                const Icon = icons[item.id] ?? AlertTriangle;
                return (
                    <article
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                        <Box className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                <Icon className="size-4 text-slate-600 dark:text-slate-300" aria-hidden />
                            </span>
                            <Box>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    {item.label}
                                </p>
                                <p className={cx("mt-1 text-2xl font-bold tabular-nums tracking-tight", toneClass[item.tone ?? "neutral"])}>
                                    {item.value}
                                </p>
                            </Box>
                        </Box>
                    </article>
                );
            })}
        </Box>
    );
}
