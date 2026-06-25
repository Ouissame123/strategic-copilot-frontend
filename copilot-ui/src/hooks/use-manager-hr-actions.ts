import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { httpClient } from "@/lib/http-client";
import { DEFAULT_PAGE_SIZE, paginationParamsRecord } from "@/lib/pagination-utils";
import { normalizeManagerHRActionsListResponse } from "@/lib/manager-hr-actions-normalize";
import {
    cancelManagerHRAction,
    createManagerHRAction,
    deleteManagerHRAction,
    ManagerHRActionsApiError,
    type FetchManagerHRActionsParams,
} from "@/api/manager-hr-actions.api";
import type { CreateManagerHRActionBody, ManagerHRActionsListResponse } from "@/types/manager-hr-actions.types";
import { assertUuid } from "@/api/manager-api-contract";
import type { ApiClientOptions } from "@/utils/apiClient";
import { getApiAuthToken } from "@/utils/apiClient";

/** WF_Manager — GET paginé */
const MANAGER_RH_ACTIONS_WEBHOOK = "/webhook/manager/rh-actions";

export const MANAGER_HR_ACTIONS_QUERY_ROOT = ["manager", "hr-actions"] as const;

export type ManagerHRActionsQueryParams = FetchManagerHRActionsParams & {
    page?: number;
    limit?: number;
    type?: string;
};

async function fetchPaginatedManagerHRActions(
    params: ManagerHRActionsQueryParams = {},
    options?: ApiClientOptions,
): Promise<ManagerHRActionsListResponse> {
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const query: Record<string, string> = {
        ...paginationParamsRecord({ page: params.page ?? 1, limit }),
    };
    if (params.status) query.status = params.status;
    if (params.project_id?.trim()) query.project_id = assertUuid(params.project_id, "project_id");
    if (params.type?.trim()) query.type = params.type.trim();

    try {
        const { data } = await httpClient.get<unknown>(MANAGER_RH_ACTIONS_WEBHOOK, {
            params: query,
            signal: options?.signal,
            skipGlobalHttpErrorToast: true,
        });
        return normalizeManagerHRActionsListResponse(data, limit);
    } catch (err) {
        if (isAxiosError(err)) {
            const status = err.response?.status ?? 0;
            const message = String(
                (err.response?.data as { message?: string })?.message ?? err.message ?? `HTTP ${status || "error"}`,
            );
            throw new ManagerHRActionsApiError(message, status, err.response?.data);
        }
        throw err;
    }
}

export function useManagerHRActionsQuery(
    params: ManagerHRActionsQueryParams = {},
    options?: { enabled?: boolean },
) {
    const token = getApiAuthToken();
    const enabled = (options?.enabled ?? true) && Boolean(token);
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const queryParams: ManagerHRActionsQueryParams = { ...params, page, limit };

    return useQuery({
        queryKey: [
            ...MANAGER_HR_ACTIONS_QUERY_ROOT,
            {
                status: queryParams.status ?? null,
                project_id: queryParams.project_id ?? null,
                type: queryParams.type ?? null,
                page,
                limit,
            },
        ],
        queryFn: ({ signal }) => fetchPaginatedManagerHRActions(queryParams, { signal }),
        enabled,
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
    });
}

export function useCreateManagerHRActionMutation() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (body: CreateManagerHRActionBody) => createManagerHRAction(body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: MANAGER_HR_ACTIONS_QUERY_ROOT });
        },
    });
}

export function useCancelManagerHRActionMutation() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => cancelManagerHRAction(id),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: MANAGER_HR_ACTIONS_QUERY_ROOT });

            const snapshots = qc
                .getQueriesData<ManagerHRActionsListResponse>({ queryKey: MANAGER_HR_ACTIONS_QUERY_ROOT })
                .map(([queryKey, data]) => ({ queryKey, data }));

            for (const { queryKey, data } of snapshots) {
                if (!data) continue;
                const filters = queryKey[2] as { status?: string | null } | undefined;
                const items = data.items.flatMap((item) => {
                    if (item.id !== id) return [item];
                    if (filters?.status && filters.status !== "cancelled") return [];
                    return [{ ...item, status: "cancelled" as const }];
                });
                qc.setQueryData(queryKey, { ...data, items });
            }

            return { snapshots };
        },
        onError: (_err, _id, ctx) => {
            ctx?.snapshots?.forEach(({ queryKey, data }) => {
                qc.setQueryData(queryKey, data);
            });
        },
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: MANAGER_HR_ACTIONS_QUERY_ROOT });
        },
    });
}

export function useDeleteManagerHRActionMutation() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteManagerHRAction(id),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: MANAGER_HR_ACTIONS_QUERY_ROOT });

            const snapshots = qc
                .getQueriesData<ManagerHRActionsListResponse>({ queryKey: MANAGER_HR_ACTIONS_QUERY_ROOT })
                .map(([queryKey, data]) => ({ queryKey, data }));

            for (const { queryKey, data } of snapshots) {
                if (!data) continue;
                const items = data.items.filter((item) => item.id !== id);
                qc.setQueryData(queryKey, {
                    ...data,
                    items,
                    count: items.length,
                });
            }

            return { snapshots };
        },
        onError: (_err, _id, ctx) => {
            ctx?.snapshots?.forEach(({ queryKey, data }) => {
                qc.setQueryData(queryKey, data);
            });
        },
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: MANAGER_HR_ACTIONS_QUERY_ROOT });
        },
    });
}

/** Alias demandé par la spec pagination. */
export const useManagerHrActions = useManagerHRActionsQuery;
