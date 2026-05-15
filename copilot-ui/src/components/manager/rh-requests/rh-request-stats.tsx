import { Ban, CheckCheck, CheckCircle2, CircleDot, Loader2, XCircle } from "lucide-react";
import type { KpiBucket } from "./rh-requests-utils";
import { kpiCardAccent } from "./rh-requests-utils";
import { cx } from "@/utils/cx";

const KPI_ORDER: { id: KpiBucket; Icon: typeof CircleDot }[] = [
    { id: "pending", Icon: CircleDot },
    { id: "accepted", Icon: CheckCircle2 },
    { id: "in_progress", Icon: Loader2 },
    { id: "done", Icon: CheckCheck },
    { id: "rejected", Icon: XCircle },
    { id: "cancelled", Icon: Ban },
];

type RHRequestStatsProps = {
    counts: Record<KpiBucket, number>;
    items: { id: KpiBucket; label: string }[];
    filterStatus: KpiBucket | "all";
    onToggleStatus: (id: KpiBucket) => void;
};

/** Bandeau KPI compact (même logique de filtre), aligné style « Mes projets ». */
export function RHRequestStats({ counts, items, filterStatus, onToggleStatus }: RHRequestStatsProps) {
    const labelById = Object.fromEntries(items.map((x) => [x.id, x.label])) as Record<KpiBucket, string>;

    return (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Statuts">
            {KPI_ORDER.map(({ id, Icon }) => {
                const count = counts[id];
                const active = filterStatus === id;
                const accent = kpiCardAccent(id);
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onToggleStatus(id)}
                        className={cx(
                            "inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-secondary bg-primary px-2 py-1 text-left text-xs font-semibold text-fg-secondary transition-colors",
                            "hover:bg-primary_hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
                            active && "border-brand-secondary bg-brand-secondary/10 text-primary ring-1 ring-brand-secondary/30",
                        )}
                    >
                        <span
                            className={cx(
                                "flex size-6 shrink-0 items-center justify-center rounded-md ring-1 ring-black/5 dark:ring-white/10",
                                accent.iconWrap,
                            )}
                        >
                            <Icon className={cx("size-3.5", id === "in_progress" && "animate-spin")} strokeWidth={2} aria-hidden />
                        </span>
                        <span className="tabular-nums text-fg-primary">{count}</span>
                        <span className="max-w-[7.5rem] truncate">{labelById[id]}</span>
                    </button>
                );
            })}
        </div>
    );
}
