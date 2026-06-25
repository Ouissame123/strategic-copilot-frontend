import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAccountsAudit, getAccountsStats, getOrphanedAccounts } from "@/api/rh-accounts-audit.api";
import { queryKeys } from "@/lib/query-keys";
import type { AuditListFilters } from "@/types/rh-accounts-audit.types";
import { getApiAuthToken } from "@/utils/apiClient";

export function useAccountsStats(enabled = true) {
    const token = getApiAuthToken();

    return useQuery({
        queryKey: queryKeys.rh.accountsStats(),
        queryFn: getAccountsStats,
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: false,
        refetchOnWindowFocus: false,
        enabled: enabled && Boolean(token),
    });
}

export function useOrphanedAccounts(limit = 100, enabled = true) {
    const token = getApiAuthToken();

    return useQuery({
        queryKey: queryKeys.rh.accountsOrphaned(limit),
        queryFn: () => getOrphanedAccounts(limit),
        staleTime: 120_000,
        retry: false,
        refetchOnWindowFocus: false,
        enabled: enabled && Boolean(token),
    });
}

export function useAccountsAudit(filters: AuditListFilters = {}, enabled = true) {
    const token = getApiAuthToken();
    const normalized = {
        since_days: filters.since_days ?? 30,
        limit: filters.limit ?? 100,
        offset: filters.offset ?? 0,
        search: filters.search?.trim() || undefined,
    };

    return useQuery({
        queryKey: queryKeys.rh.accountsAudit(normalized),
        queryFn: () => getAccountsAudit(normalized),
        placeholderData: keepPreviousData,
        staleTime: 60_000,
        retry: false,
        refetchOnWindowFocus: false,
        enabled: enabled && Boolean(token),
    });
}
