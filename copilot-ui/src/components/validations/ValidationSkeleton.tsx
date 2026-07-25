function Bone({ className }: { className: string }) {
    return <div className={`${className} animate-pulse rounded-md bg-secondary_subtle/80 dark:bg-slate-800`} />;
}

/** Skeleton liste — 3 cartes (état loading mockup). */
export function ValidationSkeleton() {
    return (
        <div className="space-y-3" aria-busy aria-label="Chargement des validations">
            {Array.from({ length: 3 }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-xl border border-secondary/70 bg-primary px-4 py-3.5 dark:border-slate-700"
                    style={{ borderLeftWidth: 4, borderLeftColor: "#e5e7eb" }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Bone className="h-5 w-16 rounded-full" />
                            <Bone className="h-4 w-48" />
                        </div>
                        <Bone className="h-3 w-28" />
                    </div>
                    <Bone className="mt-3 h-4 w-full" />
                    <Bone className="mt-1.5 h-4 w-3/4 max-w-md" />
                    <div className="mt-3 flex gap-2">
                        <Bone className="h-8 w-20 rounded-lg" />
                        <Bone className="h-8 w-24 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}
