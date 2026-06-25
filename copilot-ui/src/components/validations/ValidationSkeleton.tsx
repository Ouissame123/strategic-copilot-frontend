import { validationCardClass } from "./validation-ui";

type ValidationSkeletonProps = {
    variant: "kpi" | "list" | "sidebar";
};

function Bone({ className }: { className: string }) {
    return <div className={className + " animate-pulse rounded-md bg-secondary_subtle/80"} />;
}

export function ValidationSkeleton({ variant }: ValidationSkeletonProps) {
    if (variant === "kpi") {
        return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={validationCardClass + " space-y-3 p-5"}>
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
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className={validationCardClass + " p-4"}>
                        <Bone className="mb-3 h-4 w-36" />
                        <Bone className="h-20 w-full" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={validationCardClass}>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-secondary/40 px-4 py-3 last:border-b-0">
                    <Bone className="size-10 rounded-full" />
                    <Bone className="h-5 w-16" />
                    <Bone className="h-4 flex-1" />
                    <Bone className="h-8 w-16" />
                </div>
            ))}
        </div>
    );
}
