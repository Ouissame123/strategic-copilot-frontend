import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    availabilityDetailFromSummary,
    fetchTalentAvailability,
    indexAvailabilityOverview,
    RhAvailabilityApiError,
} from "@/api/rh-availability.api";
import type { RhAvailabilityOverviewResponse } from "@/types/rh-availability.types";
import { queryKeys } from "@/lib/query-keys";
import type { RhTalentAvailabilitySummary } from "@/types/rh-availability.types";

export type TalentAvailabilityQueryCtx = {
    token?: string;
    apiBase?: string;
};

export function useTalentAvailability(
    talentId: string | null | undefined,
    ctx: TalentAvailabilityQueryCtx,
    options?: {
        enabled?: boolean;
        /** Aperçu overview déjà connu (évite un GET détail si 404). */
        listSummary?: RhTalentAvailabilitySummary | null;
    },
) {
    const id = talentId?.trim() ?? "";
    const qc = useQueryClient();

    return useQuery({
        queryKey: [...queryKeys.rh.talentAvailability(id), ctx.token ?? "session"],
        queryFn: async ({ signal }) => {
            const overviewCached = qc.getQueryData<RhAvailabilityOverviewResponse>([
                ...queryKeys.rh.availabilityOverview(),
                ctx.token ?? "session",
            ]);
            const overviewById = {
                ...indexAvailabilityOverview(overviewCached ?? undefined),
                ...(options?.listSummary?.talent_id
                    ? { [options.listSummary.talent_id]: options.listSummary }
                    : {}),
            };

            try {
                return await fetchTalentAvailability(id, {
                    token: ctx.token,
                    apiBase: ctx.apiBase,
                    signal,
                    overviewById,
                });
            } catch (err) {
                const row = overviewById[id] ?? options?.listSummary;
                if (err instanceof RhAvailabilityApiError && err.httpStatus === 404 && row) {
                    return availabilityDetailFromSummary(row);
                }
                throw err;
            }
        },
        enabled: Boolean(id) && (options?.enabled !== false),
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
    });
}
