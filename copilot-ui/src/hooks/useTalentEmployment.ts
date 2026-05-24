import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    deleteTalentEmployment,
    getTalentEmployment,
    mapRhTalentEmploymentApiError,
    updateTalentEmployment,
} from "@/api/rh-employment.api";
import { queryKeys } from "@/lib/query-keys";
import type { UpdateEmploymentPayload } from "@/types/rh-employment.types";

export type TalentEmploymentQueryCtx = {
    token?: string;
    apiBase?: string;
};

export function useTalentEmployment(
    talentId: string | null | undefined,
    ctx: TalentEmploymentQueryCtx,
    options?: { enabled?: boolean },
) {
    const id = talentId?.trim() ?? "";
    return useQuery({
        queryKey: queryKeys.rh.talentEmployment(id),
        queryFn: ({ signal }) => getTalentEmployment(id, { token: ctx.token, apiBase: ctx.apiBase, signal }),
        enabled: Boolean(id) && (options?.enabled !== false),
        staleTime: 60_000,
        retry: false,
        refetchOnWindowFocus: false,
    });
}

function invalidateEmployment(qc: ReturnType<typeof useQueryClient>, talentId: string) {
    void qc.invalidateQueries({ queryKey: queryKeys.rh.talentEmployment(talentId) });
    void qc.invalidateQueries({ queryKey: queryKeys.rh.talentDetail(talentId) });
}

export function useUpdateTalentEmployment(talentId: string, ctx: TalentEmploymentQueryCtx) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: UpdateEmploymentPayload) =>
            updateTalentEmployment(talentId, payload, { token: ctx.token, apiBase: ctx.apiBase }),
        onSuccess: () => invalidateEmployment(qc, talentId),
    });
}

export function useDeleteTalentEmployment(talentId: string, ctx: TalentEmploymentQueryCtx) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => deleteTalentEmployment(talentId, { token: ctx.token, apiBase: ctx.apiBase }),
        onSuccess: () => invalidateEmployment(qc, talentId),
    });
}

export { mapRhTalentEmploymentApiError };

/** @deprecated Utiliser `useTalentEmployment`. */
export const useRhTalentEmploymentQuery = useTalentEmployment;

/** @deprecated Utiliser `useUpdateTalentEmployment`. */
export function useUpdateRhTalentEmploymentMutation(talentId: string, ctx: TalentEmploymentQueryCtx) {
    return useUpdateTalentEmployment(talentId, ctx);
}

/** @deprecated Utiliser `useUpdateTalentEmployment` (PUT upsert). */
export function useCreateRhTalentEmploymentMutation(talentId: string, ctx: TalentEmploymentQueryCtx) {
    return useUpdateTalentEmployment(talentId, ctx);
}

/** @deprecated Utiliser `useDeleteTalentEmployment`. */
export function useDeleteRhTalentEmploymentMutation(talentId: string, ctx: TalentEmploymentQueryCtx) {
    return useDeleteTalentEmployment(talentId, ctx);
}

export type RhTalentEmploymentQueryCtx = TalentEmploymentQueryCtx;
