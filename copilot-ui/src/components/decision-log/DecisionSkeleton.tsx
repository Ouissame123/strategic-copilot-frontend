import { decisionLogCardClass } from "./decision-log-ui";

type DecisionSkeletonProps = {
    variant: "kpi" | "history" | "sidebar";
};

function Bone({ className }: { className: string }) {
    return <div className={className + " animate-pulse rounded-md bg-secondary_subtle/80 dark:bg-secondary_subtle/30"} />;
}

export function DecisionSkeleton({ variant }: DecisionSkeletonProps) {
    if (variant === "kpi") {
        return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={decisionLogCardClass + " space-y-3 p-5"}>
                        <Bone className="h-3 w-24" />
                        <Bone className="h-8 w-16" />
                        <Bone className="h-2 w-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (variant === "sidebar") {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={decisionLogCardClass + " p-4"}>
                        <Bone className="mb-3 h-4 w-40" />
                        <Bone className="h-24 w-full" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={decisionLogCardClass}>
            <div className="border-b border-secondary/60 px-4 py-3">
                <Bone className="h-4 w-28" />
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-secondary/40 px-4 py-3 last:border-b-0">
                    <Bone className="h-5 w-16" />
                    <Bone className="h-4 flex-1" />
                    <Bone className="hidden h-4 w-12 md:block" />
                    <Bone className="hidden h-4 w-12 md:block" />
                    <Bone className="h-3 w-16" />
                </div>
            ))}
        </div>
    );
}
