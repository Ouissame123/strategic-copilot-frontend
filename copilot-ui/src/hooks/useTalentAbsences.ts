import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createTalentAbsence,
    deleteTalentAbsence,
    getTalentAbsences,
    mapRhTalentAbsencesApiError,
} from "@/api/rh-absences.api";
import { queryKeys } from "@/lib/query-keys";
import type { CreateRhTalentAbsencePayload } from "@/types/rh-absences.types";

export type TalentAbsencesQueryCtx = {
    token?: string;
    apiBase?: string;
};

export function talentAbsencesQueryKey(talentId: string) {
    return queryKeys.rh.talentAbsences(talentId);
}

export function useTalentAbsences(talentId: string | null | undefined, ctx: TalentAbsencesQueryCtx) {
    const id = talentId?.trim() ?? "";
    return useQuery({
        queryKey: talentAbsencesQueryKey(id),
        queryFn: ({ signal }) => getTalentAbsences(id, { token: ctx.token, signal }),
        enabled: Boolean(id),
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
    });
}

function invalidateTalentAbsences(qc: ReturnType<typeof useQueryClient>, talentId: string) {
    void qc.invalidateQueries({ queryKey: ["talent-absences", talentId] });
    void qc.invalidateQueries({ queryKey: talentAbsencesQueryKey(talentId) });
}

export function useCreateTalentAbsence(talentId: string, ctx: TalentAbsencesQueryCtx) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateRhTalentAbsencePayload) =>
            createTalentAbsence(talentId, payload, { token: ctx.token }),
        onSuccess: () => invalidateTalentAbsences(qc, talentId),
    });
}

export function useDeleteTalentAbsence(talentId: string, ctx: TalentAbsencesQueryCtx) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (absenceId: string) => deleteTalentAbsence(absenceId, { token: ctx.token }),
        onSuccess: () => invalidateTalentAbsences(qc, talentId),
    });
}

export { mapRhTalentAbsencesApiError };
