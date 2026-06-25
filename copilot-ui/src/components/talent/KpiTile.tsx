import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { TALENT_KPI_CARD } from "@/components/talent/ui/talent-workspace-ui";
import { toneClasses } from "@/components/talent/dashboard/talent-dashboard-tones";
import { cx } from "@/utils/cx";

export type KpiProgressColor = "green" | "yellow" | "orange" | "red" | "violet" | "blue";

const PROGRESS_COLORS: Record<KpiProgressColor, string> = {
    green: "bg-emerald-500",
    yellow: "bg-amber-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
    violet: "bg-violet-500",
    blue: "bg-blue-500",
};

type KpiTileProps = {
    icon: LucideIcon;
    label: string;
    value: string | number;
    unit?: string;
    badge?: { text: string; tone?: string };
    description?: string;
    progress?: number;
    progressColor?: KpiProgressColor;
    progressAriaLabel?: string;
};

function KpiBadge({ text, tone }: { text: string; tone?: string }) {
    const cls = toneClasses(tone);
    return (
        <span className={cx("inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold", cls.badge)}>
            <span className="truncate">{text}</span>
        </span>
    );
}

export function KpiTile({
    icon: Icon,
    label,
    value,
    unit,
    badge,
    description,
    progress,
    progressColor = "violet",
    progressAriaLabel,
}: KpiTileProps) {
    const progressNode: ReactNode =
        progress !== undefined ? (
            <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary/60"
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={progressAriaLabel ?? label}
            >
                <div
                    className={cx("h-full transition-all duration-500", PROGRESS_COLORS[progressColor])}
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
        ) : null;

    return (
        <article className={cx(TALENT_KPI_CARD, "min-h-0")}>
            <div className="mb-3 flex items-center gap-2 text-tertiary">
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="text-sm font-medium text-secondary">{label}</span>
            </div>
            <div className="mb-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight tabular-nums text-primary">{value}</span>
                {unit ? <span className="text-sm text-tertiary">{unit}</span> : null}
            </div>
            {badge ? (
                <div className="mb-2">
                    <KpiBadge text={badge.text} tone={badge.tone} />
                </div>
            ) : null}
            {description ? <p className="mt-1 text-xs text-tertiary">{description}</p> : null}
            {progressNode}
        </article>
    );
}
