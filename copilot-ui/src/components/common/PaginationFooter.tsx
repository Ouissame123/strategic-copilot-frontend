import { useMemo } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import {
    DEFAULT_PAGE_SIZE,
    getPaginationRange,
    PAGE_SIZE_OPTIONS,
    type PaginationMeta,
} from "@/lib/pagination-utils";
import { cx } from "@/utils/cx";

type PaginationFooterProps = {
    pagination?: PaginationMeta;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    itemLabel?: string;
    loading?: boolean;
    className?: string;
};

export function PaginationFooter({
    pagination,
    onPageChange,
    onPageSizeChange,
    itemLabel = "éléments",
    loading,
    className,
}: PaginationFooterProps) {
    const range = useMemo(
        () => (pagination ? getPaginationRange(pagination.page, pagination.total_pages, 1) : []),
        [pagination],
    );

    if (!pagination || pagination.total === 0) return null;

    const firstItem = (pagination.page - 1) * pagination.page_size + 1;
    const lastItem = Math.min(pagination.page * pagination.page_size, pagination.total);

    return (
        <div
            className={cx(
                "flex flex-col items-center justify-between gap-4 border-t border-secondary/60 px-4 py-3 sm:flex-row",
                className,
            )}
        >
            <p className="text-xs tabular-nums text-secondary">
                <span className="font-medium text-primary">
                    {firstItem}–{lastItem}
                </span>{" "}
                sur <span className="font-medium text-primary">{pagination.total}</span> {itemLabel}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
                {onPageSizeChange ? (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-tertiary">Par page</span>
                        <select
                            value={String(pagination.page_size)}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                            disabled={loading}
                            aria-label="Nombre d'éléments par page"
                            className="h-8 w-[5rem] rounded-lg border border-secondary bg-primary px-2 text-xs text-primary"
                        >
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}

                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        color="secondary"
                        size="sm"
                        className="!size-8 !p-0"
                        isDisabled={pagination.page <= 1 || loading}
                        onClick={() => onPageChange(pagination.page - 1)}
                        aria-label="Page précédente"
                    >
                        <ChevronLeft className="size-3.5" aria-hidden />
                    </Button>

                    {range.map((item, idx) =>
                        item === "dots" ? (
                            <span key={`dots-${idx}`} className="px-1 text-tertiary" aria-hidden>
                                <MoreHorizontal className="size-3.5" />
                            </span>
                        ) : (
                            <Button
                                key={item}
                                type="button"
                                color={item === pagination.page ? "primary" : "secondary"}
                                size="sm"
                                className="!h-8 min-w-[2rem] !px-2 text-xs tabular-nums"
                                isDisabled={loading}
                                onClick={() => onPageChange(item)}
                                aria-current={item === pagination.page ? "page" : undefined}
                            >
                                {item}
                            </Button>
                        ),
                    )}

                    <Button
                        type="button"
                        color="secondary"
                        size="sm"
                        className="!size-8 !p-0"
                        isDisabled={!pagination.has_more || pagination.page >= pagination.total_pages || loading}
                        onClick={() => onPageChange(pagination.page + 1)}
                        aria-label="Page suivante"
                    >
                        <ChevronRight className="size-3.5" aria-hidden />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export { DEFAULT_PAGE_SIZE };
