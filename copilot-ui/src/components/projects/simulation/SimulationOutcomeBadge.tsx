import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";

type SimulationOutcomeBadgeProps = {
    delta: number;
    className?: string;
};

export function SimulationOutcomeBadge({ delta, className }: SimulationOutcomeBadgeProps) {
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);
    const favorable = delta > 0;

    return (
        <span
            className={cx(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                favorable
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
                className,
            )}
        >
            {favorable ? <ThumbsUp className="size-3.5" aria-hidden /> : <ThumbsDown className="size-3.5" aria-hidden />}
            {favorable ? tm("simulationFavorable") : tm("simulationUnfavorable")}
        </span>
    );
}
