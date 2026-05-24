import {
    loadBarFillClassMuted,
    loadBarTrackClassMuted,
    loadPctTextClassMuted,
    loadTierBadgeClassMuted,
    loadTierLabel,
    resolveLoadTier,
} from "@/lib/rh-assignments-display";
import { cx } from "@/utils/cx";

export type StaffingLoadBarProps = {
    loadPct: number | null;
    /** @deprecated Affiché uniquement en mode détail drawer */
    allocationPct?: number | null;
    showBadge?: boolean;
    emphasize?: boolean;
    className?: string;
};

/** Barre de charge compacte pour le board — %, badge et barre alignés proprement. */
export function StaffingLoadBar({
    loadPct,
    showBadge = true,
    emphasize = false,
    className,
}: StaffingLoadBarProps) {
    const tier = resolveLoadTier(loadPct);
    const displayPct = loadPct != null ? Math.min(150, Math.max(0, Math.round(loadPct))) : null;
    const barWidth = displayPct != null ? Math.min(100, displayPct) : 0;

    return (
        <div className={cx("min-w-0 flex-1", className)}>
            <div className="flex items-center gap-2">
                <span
                    className={cx(
                        "shrink-0 font-semibold tabular-nums leading-none",
                        emphasize ? "text-sm" : "text-xs",
                        loadPctTextClassMuted(tier),
                    )}
                >
                    {displayPct != null ? `${displayPct}%` : "—"}
                </span>
                {showBadge && tier && tier !== "available" ? (
                    <span
                        className={cx(
                            "inline-flex shrink-0 rounded px-1.5 py-px text-[9px] font-medium leading-none ring-1 ring-inset",
                            loadTierBadgeClassMuted(tier),
                        )}
                    >
                        {loadTierLabel(tier)}
                    </span>
                ) : null}
                <div
                    className={cx(
                        "min-w-[4rem] flex-1 overflow-hidden rounded-full",
                        emphasize ? "h-1" : "h-0.5",
                        loadBarTrackClassMuted(tier),
                    )}
                    role="progressbar"
                    aria-valuenow={displayPct ?? undefined}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={displayPct != null ? `Charge ${displayPct}%` : "Charge"}
                >
                    <div
                        className={cx(
                            "h-full rounded-full transition-[width] duration-500 ease-out",
                            loadBarFillClassMuted(tier),
                        )}
                        style={{ width: `${barWidth}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
