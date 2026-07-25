import { cx } from "@/utils/cx";

type ProjectTimelineMiniProps = {
    startDate: string | null | undefined;
    milestoneDate: string | null | undefined;
};

function shortDateFr(value: string): string {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    return new Date(parsed).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function startOfDay(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function progressRatio(startIso: string, endIso: string, now = new Date()): number {
    const start = startOfDay(new Date(startIso));
    const end = startOfDay(new Date(endIso));
    const today = startOfDay(now);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return today >= end ? 1 : 0;
    }
    if (today <= start) return 0;
    if (today >= end) return 1;
    return (today - start) / (end - start);
}

export function ProjectTimelineMini({ startDate, milestoneDate }: ProjectTimelineMiniProps) {
    if (!startDate && !milestoneDate) return null;

    const hasRange = Boolean(startDate && milestoneDate);
    const overdue =
        milestoneDate != null &&
        !Number.isNaN(Date.parse(milestoneDate)) &&
        startOfDay(new Date()) > startOfDay(new Date(milestoneDate));

    const ratio = hasRange && startDate && milestoneDate ? progressRatio(startDate, milestoneDate) : overdue ? 1 : 0.5;
    const clamped = Math.min(1, Math.max(0, ratio));
    const pct = `${clamped * 100}%`;

    return (
        <div className="mt-3" aria-hidden={false}>
            <div className="flex items-center justify-between gap-2 text-[11px] text-tertiary">
                <span className="min-w-0 truncate">
                    {startDate ? `Début (${shortDateFr(startDate)})` : "Début"}
                </span>
                <span className="min-w-0 truncate text-right">
                    {milestoneDate ? `Jalon (${shortDateFr(milestoneDate)})` : "Jalon"}
                </span>
            </div>
            <div className="relative mt-2 h-2 w-full">
                <div className="absolute inset-y-[3px] left-0 right-0 rounded-full bg-secondary dark:bg-secondary/80" />
                <div
                    className={cx(
                        "absolute inset-y-[3px] left-0 rounded-full transition-[width]",
                        overdue ? "bg-red-500 dark:bg-red-400" : "bg-brand-solid",
                    )}
                    style={{ width: pct }}
                />
                <span
                    className={cx(
                        "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary shadow-sm",
                        overdue ? "bg-red-500 dark:bg-red-400" : "bg-brand-solid",
                    )}
                    style={{ left: pct }}
                />
            </div>
        </div>
    );
}
