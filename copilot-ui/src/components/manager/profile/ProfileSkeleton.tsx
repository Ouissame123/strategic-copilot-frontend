import { PROFILE_CARD } from "./profile-shared";
import { StatPillSkeleton } from "./StatPill";

export function ProfileSkeleton() {
    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <aside className={PROFILE_CARD + " rounded-3xl p-6"}>
                <div className="mx-auto size-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="mx-auto mt-4 h-6 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="mx-auto mt-2 h-4 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="mt-6 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <StatPillSkeleton key={i} />
                    ))}
                </div>
            </aside>
            <div className="space-y-4">
                <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <div className={PROFILE_CARD + " h-80 animate-pulse"} />
            </div>
        </div>
    );
}
