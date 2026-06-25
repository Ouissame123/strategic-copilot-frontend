export interface PaginationMeta {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_more: boolean;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export function buildPaginationQuery(params: PaginationParams): URLSearchParams {
    const sp = new URLSearchParams();
    if (params.page && params.page > 0) sp.set("page", String(params.page));
    if (params.limit && params.limit > 0) sp.set("limit", String(params.limit));
    return sp;
}

export function paginationParamsRecord(params: PaginationParams): Record<string, string> {
    const out: Record<string, string> = {};
    if (params.page && params.page > 0) out.page = String(params.page);
    if (params.limit && params.limit > 0) out.limit = String(params.limit);
    return out;
}

/** Normalise l'objet pagination renvoyé par n8n (tolère champs manquants). */
export function parsePaginationMeta(raw: unknown, fallbackCount = 0, fallbackPageSize = DEFAULT_PAGE_SIZE): PaginationMeta | undefined {
    if (!raw || typeof raw !== "object") {
        if (fallbackCount <= 0) return undefined;
        return {
            page: 1,
            page_size: fallbackPageSize,
            total: fallbackCount,
            total_pages: 1,
            has_more: false,
        };
    }
    const p = raw as Record<string, unknown>;
    const page = Math.max(1, Number(p.page) || 1);
    const page_size = Math.max(1, Number(p.page_size ?? p.limit) || fallbackPageSize);
    const total = Math.max(0, Number(p.total) || fallbackCount);
    const total_pages = Math.max(1, Number(p.total_pages) || Math.ceil(total / page_size) || 1);
    const has_more = typeof p.has_more === "boolean" ? p.has_more : page < total_pages;
    return { page, page_size, total, total_pages, has_more };
}

/**
 * Plage de pages pour les contrôles : [1, 2, 3, 'dots', 22]
 */
export function getPaginationRange(currentPage: number, totalPages: number, siblings = 1): (number | "dots")[] {
    if (totalPages <= 1) return totalPages === 1 ? [1] : [];
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const left = Math.max(currentPage - siblings, 2);
    const right = Math.min(currentPage + siblings, totalPages - 1);
    const result: (number | "dots")[] = [1];

    if (left > 2) result.push("dots");
    else for (let i = 2; i < left; i++) result.push(i);

    for (let i = left; i <= right; i++) result.push(i);

    if (right < totalPages - 1) result.push("dots");
    else for (let i = right + 1; i < totalPages; i++) result.push(i);

    result.push(totalPages);
    return result;
}
