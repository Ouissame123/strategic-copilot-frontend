import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getManagerAnalystIPI,
    getManagerAnalystMobility,
    getManagerAnalystNineBox,
    mapManagerAnalystApiError,
} from "@/api/manager-analyst.api";
import { buildDashboardAnalystView } from "@/lib/manager-analyst-normalize";
import { queryKeys } from "@/lib/query-keys";
import { getApiAuthToken } from "@/utils/apiClient";

function analystContextKey(enterpriseId: string, managerId: string) {
    return { enterpriseId: enterpriseId.trim(), managerId: managerId.trim() };
}

export function useManagerAnalystIpiQuery(enterpriseId: string | undefined, managerId: string | undefined) {
    const ctx = enterpriseId?.trim() && managerId?.trim() ? analystContextKey(enterpriseId, managerId) : null;
    return useQuery({
        queryKey: queryKeys.manager.analystIpi(ctx ?? "disabled"),
        queryFn: ({ signal }) =>
            getManagerAnalystIPI(ctx!.enterpriseId, ctx!.managerId, { signal, token: getApiAuthToken() }),
        enabled: Boolean(ctx),
        staleTime: 60_000,
        retry: false,
    });
}

export function useManagerAnalystNineBoxQuery(enterpriseId: string | undefined, managerId: string | undefined) {
    const ctx = enterpriseId?.trim() && managerId?.trim() ? analystContextKey(enterpriseId, managerId) : null;
    return useQuery({
        queryKey: queryKeys.manager.analystNineBox(ctx ?? "disabled"),
        queryFn: ({ signal }) =>
            getManagerAnalystNineBox(ctx!.enterpriseId, ctx!.managerId, { signal, token: getApiAuthToken() }),
        enabled: Boolean(ctx),
        staleTime: 60_000,
        retry: false,
    });
}

export function useManagerAnalystMobilityQuery(enterpriseId: string | undefined, managerId: string | undefined) {
    const ctx = enterpriseId?.trim() && managerId?.trim() ? analystContextKey(enterpriseId, managerId) : null;
    return useQuery({
        queryKey: queryKeys.manager.analystMobility(ctx ?? "disabled"),
        queryFn: ({ signal }) =>
            getManagerAnalystMobility(ctx!.enterpriseId, ctx!.managerId, { signal, token: getApiAuthToken() }),
        enabled: Boolean(ctx),
        staleTime: 60_000,
        retry: false,
    });
}

export function useManagerAnalystDashboard(enterpriseId: string | undefined, managerId: string | undefined) {
    const ipiQ = useManagerAnalystIpiQuery(enterpriseId, managerId);
    const nineBoxQ = useManagerAnalystNineBoxQuery(enterpriseId, managerId);
    const mobilityQ = useManagerAnalystMobilityQuery(enterpriseId, managerId);
    const qc = useQueryClient();

    const isLoading = ipiQ.isPending || nineBoxQ.isPending || mobilityQ.isPending;
    const isError = ipiQ.isError || nineBoxQ.isError || mobilityQ.isError;
    const isReady = ipiQ.isSuccess && nineBoxQ.isSuccess && mobilityQ.isSuccess;

    const analyst = isReady
        ? buildDashboardAnalystView(ipiQ.data, nineBoxQ.data, mobilityQ.data)
        : undefined;

    const errorMessage =
        ipiQ.isError
            ? mapManagerAnalystApiError(ipiQ.error)
            : nineBoxQ.isError
              ? mapManagerAnalystApiError(nineBoxQ.error)
              : mobilityQ.isError
                ? mapManagerAnalystApiError(mobilityQ.error)
                : null;

    const refetchAll = async () => {
        const ctx = enterpriseId?.trim() && managerId?.trim() ? analystContextKey(enterpriseId, managerId) : null;
        if (!ctx) return;
        await Promise.all([
            qc.invalidateQueries({ queryKey: queryKeys.manager.analystIpi(ctx) }),
            qc.invalidateQueries({ queryKey: queryKeys.manager.analystNineBox(ctx) }),
            qc.invalidateQueries({ queryKey: queryKeys.manager.analystMobility(ctx) }),
        ]);
    };

    return {
        ipiQuery: ipiQ,
        nineBoxQuery: nineBoxQ,
        mobilityQuery: mobilityQ,
        analyst,
        isLoading,
        isError,
        isReady,
        errorMessage,
        refetchAll,
        hasContext: Boolean(enterpriseId?.trim() && managerId?.trim()),
    };
}

export { mapManagerAnalystApiError };
