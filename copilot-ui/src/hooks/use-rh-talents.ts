import { useMutation } from "@tanstack/react-query";
import { updateRhTalent } from "@/api/rh-talents.api";
import type { UpdateRhTalentPayload } from "@/types/rh-talents.types";

export type UpdateRhTalentMutationVars = {
    talentId: string;
    payload: UpdateRhTalentPayload;
    apiBase?: string;
    token?: string;
};

export function useUpdateRhTalentMutation() {
    return useMutation({
        mutationFn: ({ talentId, payload, apiBase, token }: UpdateRhTalentMutationVars) =>
            updateRhTalent(talentId, payload, { apiBase, token }),
    });
}
