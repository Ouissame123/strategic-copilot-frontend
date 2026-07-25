export function DashboardV3Skeleton() {
    return (
        <div className="mx-auto max-w-[1440px] space-y-3 bg-[color:var(--bg)] px-4 pt-1 pb-6 sm:px-6">
            <div className="ops-skeleton h-16 rounded-[10px]" />
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="ops-skeleton h-[88px] rounded-[10px]" />
                ))}
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_360px]">
                <div className="ops-skeleton h-[420px] rounded-[10px]" />
                <div className="ops-skeleton hidden h-[420px] rounded-[10px] lg:block" />
            </div>
        </div>
    );
}
