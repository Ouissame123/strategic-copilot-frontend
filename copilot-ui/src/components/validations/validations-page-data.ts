import type { PaginationMeta } from "@/lib/pagination-utils";
import type { PendingValidation, ValidationsSummary } from "@/services/validations.api";
import type { ValidationCategory } from "@/services/validations.api";
import {
    dedupeValidations,
    filterDedupEntriesByType,
    filterValidationsByTime,
    sortDedupEntriesByPriorityDesc,
    type ValidationDedupEntry,
    type ValidationsTimeFilterId,
} from "@/lib/manager-validations-list-utils";

export type ValidationsUrlTimeFilter = "today" | "7d" | "30d" | "all";

export function urlTimeToInternal(time: ValidationsUrlTimeFilter): ValidationsTimeFilterId {
    if (time === "7d") return "week";
    if (time === "30d") return "month";
    if (time === "today") return "today";
    return "all";
}

export function internalTimeToUrl(time: ValidationsTimeFilterId): ValidationsUrlTimeFilter {
    if (time === "week") return "7d";
    if (time === "month") return "30d";
    if (time === "today") return "today";
    return "all";
}

export type ValidationsPageFilters = {
    page: number;
    limit: number;
    time_filter: ValidationsUrlTimeFilter;
    type?: string;
    bucket?: ValidationCategory;
    search?: string;
};

export type ValidationsKpiStats = {
    total: number;
    blocking: number;
    period_30d: number;
    new_7d: number;
    new_7d_delta?: number;
};

export function buildKpiStats(summary: ValidationsSummary | undefined, items: PendingValidation[]): ValidationsKpiStats {
    const now = Date.now();
    const weekAgo = now - 7 * 86_400_000;
    const twoWeeksAgo = now - 14 * 86_400_000;
    const monthAgo = now - 30 * 86_400_000;

    let new7d = 0;
    let prev7d = 0;
    let period30d = 0;

    for (const it of items) {
        const t = new Date(it.created_at).getTime();
        if (!Number.isFinite(t)) continue;
        if (t >= monthAgo) period30d += 1;
        if (t >= weekAgo) new7d += 1;
        else if (t >= twoWeeksAgo) prev7d += 1;
    }

    return {
        total: summary?.total_pending ?? items.length,
        blocking: summary?.blocking_count ?? summary?.missing_justification_count ?? 0,
        period_30d: period30d,
        new_7d: new7d,
        new_7d_delta: new7d - prev7d,
    };
}

export function filterEntriesBySearch(entries: ValidationDedupEntry[], search?: string): ValidationDedupEntry[] {
    const q = search?.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
        const it = e.item;
        const hay = `${it.project_name ?? ""} ${it.talent_name ?? ""} ${it.why ?? ""} ${it.type_label ?? ""}`.toLowerCase();
        return hay.includes(q);
    });
}

export function groupEntriesByPdfBucket(
    entries: ValidationDedupEntry[],
): Record<ValidationCategory, ValidationDedupEntry[]> {
    return {
        conflict: entries.filter((e) => e.item.category === "conflict"),
        missing_justification: entries.filter((e) => e.item.category === "missing_justification"),
        standard: entries.filter((e) => e.item.category === "standard"),
    };
}

export function paginateStandardQueue(
    standard: ValidationDedupEntry[],
    page: number,
    limit: number,
): { items: ValidationDedupEntry[]; pagination: PaginationMeta } {
    const total = standard.length;
    const total_pages = Math.max(1, Math.ceil(total / limit) || 1);
    const safePage = Math.min(Math.max(1, page), total_pages);
    const start = (safePage - 1) * limit;
    const items = standard.slice(start, start + limit);
    return {
        items,
        pagination: {
            page: safePage,
            page_size: limit,
            total,
            total_pages,
            has_more: safePage < total_pages,
        },
    };
}

export function buildProcessedValidations(items: PendingValidation[], filters: ValidationsPageFilters) {
    const timeId = urlTimeToInternal(filters.time_filter);
    const byTime = filterValidationsByTime(items, timeId);
    const deduped = sortDedupEntriesByPriorityDesc(dedupeValidations(byTime));
    const byType =
        filters.type && filters.type !== "all"
            ? filterDedupEntriesByType(deduped, filters.type as "rh_action" | "arbitrage" | "decision")
            : deduped;
    const searched = filterEntriesBySearch(byType, filters.search);
    const buckets = groupEntriesByPdfBucket(searched);

    const bucketFilter = filters.bucket;
    const conflicts = bucketFilter && bucketFilter !== "conflict" ? [] : buckets.conflict;
    const missingJustif =
        bucketFilter && bucketFilter !== "missing_justification" ? [] : buckets.missing_justification;
    const standardAll = bucketFilter && bucketFilter !== "standard" ? [] : buckets.standard;
    const { items: standardPage, pagination } = paginateStandardQueue(standardAll, filters.page, filters.limit);

    return {
        conflicts,
        missing_justif: missingJustif,
        standard_queue: standardPage,
        pagination: standardAll.length > 0 ? pagination : undefined,
        bucketCounts: {
            conflict: buckets.conflict.length,
            missing_justification: buckets.missing_justification.length,
            standard: buckets.standard.length,
        },
    };
}

export type ImpactedProject = { project_id: string; name: string; count: number };

export function topImpactedProjects(items: PendingValidation[], limit = 8): ImpactedProject[] {
    const map = new Map<string, ImpactedProject>();
    for (const it of items) {
        const pid = it.project_id?.trim() || "unknown";
        const name = it.project_name?.trim() || "Sans projet";
        const cur = map.get(pid);
        if (cur) cur.count += 1;
        else map.set(pid, { project_id: pid, name, count: 1 });
    }
    return Array.from(map.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}
