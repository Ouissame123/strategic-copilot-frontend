import { useMutation, useQuery } from "@tanstack/react-query";
import {
    fetchRhMatchingProjects,
    fetchRhMatchingResults,
    mapRhMatchingApiError,
    MATCHING_TIMEOUT_MS,
    runRhWorkforceMatching,
} from "@/api/rh-matching.api";
import { queryKeys } from "@/lib/query-keys";
import type { RhMatchingRunPayload, RhMatchingRunResponse } from "@/types/rh-matching.types";

export function useRhMatchingProjects(token: string | undefined) {
    const t = token?.trim() ?? "";
    return useQuery({
        queryKey: queryKeys.rh.matchingProjects(),
        queryFn: ({ signal }) => fetchRhMatchingProjects({ token: t, signal }),
        enabled: Boolean(t),
        staleTime: 5 * 60_000,
        retry: false,
    });
}

export function useRhMatchingResults(
    projectId: string | null,
    enabled: boolean,
    token?: string,
) {
    const id = projectId?.trim() ?? "";
    return useQuery({
        queryKey: queryKeys.rh.matchingResults(id),
        queryFn: ({ signal }) => fetchRhMatchingResults(id, { token, signal }),
        enabled: Boolean(id) && enabled,
        staleTime: 30_000,
        retry: false,
    });
}

export function useRunRhWorkforceMatching(token?: string) {
    return useMutation({
        mutationFn: (payload: RhMatchingRunPayload) =>
            runRhWorkforceMatching(payload, { token, timeout: MATCHING_TIMEOUT_MS }),
    });
}

export { mapRhMatchingApiError };
export type { RhMatchingRunResponse };
