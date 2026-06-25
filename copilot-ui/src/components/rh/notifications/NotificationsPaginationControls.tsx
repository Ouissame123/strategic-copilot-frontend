import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import type { NotificationsPagination } from "@/types/rh-notifications.types";
import { cx } from "@/utils/cx";

type NotificationsPaginationControlsProps = {
    pagination: NotificationsPagination;
    onOffsetChange: (offset: number) => void;
    loading?: boolean;
    className?: string;
};

export function NotificationsPaginationControls({
    pagination,
    onOffsetChange,
    loading,
    className,
}: NotificationsPaginationControlsProps) {
    const { total, limit, offset, page, total_pages, has_more, prev_offset, next_offset } = pagination;
    if (total === 0) return null;

    const first = offset + 1;
    const last = Math.min(offset + limit, total);

    return (
        <div
            className={cx(
                "flex flex-col items-center justify-between gap-3 border-t border-secondary/60 px-4 py-3 sm:flex-row",
                className,
            )}
        >
            <p className="text-xs tabular-nums text-secondary">
                Page <span className="font-medium text-primary">{page}</span> sur{" "}
                <span className="font-medium text-primary">{total_pages}</span> ·{" "}
                <span className="font-medium text-primary">{total.toLocaleString("fr-FR")}</span> résultats ·{" "}
                {first}–{last} affichés
            </p>
            <div className="flex items-center gap-2">
                <Button
                    color="secondary"
                    size="sm"
                    isDisabled={loading || prev_offset == null && offset <= 0}
                    onPress={() => onOffsetChange(Math.max(0, prev_offset ?? offset - limit))}
                >
                    <ChevronLeft className="mr-1 size-3.5" aria-hidden />
                    Précédent
                </Button>
                <Button
                    color="secondary"
                    size="sm"
                    isDisabled={loading || (!has_more && page >= total_pages)}
                    onPress={() => onOffsetChange(next_offset ?? offset + limit)}
                >
                    Suivant
                    <ChevronRight className="ml-1 size-3.5" aria-hidden />
                </Button>
            </div>
        </div>
    );
}
