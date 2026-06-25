import { DEFAULT_PAGE_SIZE } from "@/lib/pagination-utils";

export function readUrlPagination(searchParams: URLSearchParams, defaultLimit = DEFAULT_PAGE_SIZE) {
    return {
        page: Math.max(1, Number(searchParams.get("page")) || 1),
        limit: Math.max(1, Number(searchParams.get("limit")) || defaultLimit),
    };
}

/** Fusionne filtres + pagination ; omet page=1 et limit par défaut. */
export function buildManagerListSearchParams(
    base: Record<string, string | undefined | null>,
    pagination: { page: number; limit: number },
    defaultLimit = DEFAULT_PAGE_SIZE,
): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(base)) {
        const v = value?.trim();
        if (v) out[key] = v;
    }
    if (pagination.page > 1) out.page = String(pagination.page);
    if (pagination.limit !== defaultLimit) out.limit = String(pagination.limit);
    return out;
}
