import { cx } from "@/utils/cx";

const pulse = "animate-pulse rounded-xl bg-secondary/50";

export function TalentDashboardSkeleton() {
    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            <div className={cx(pulse, "h-36 w-full")} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={cx(pulse, "h-32")} />
                ))}
            </div>
            <div className={cx(pulse, "h-28 w-full")} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className={cx(pulse, "h-44")} />
                <div className={cx(pulse, "h-44")} />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className={cx(pulse, "h-40")} />
                <div className={cx(pulse, "h-40")} />
            </div>
        </div>
    );
}
