import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSkillsCatalog } from "@/api/rh-skills.api";
import {
    addTalentSkill,
    deleteTalentSkill,
    getTalentSkills,
    mapRhTalentSkillApiError,
    updateTalentSkill,
} from "@/api/rh-talent-skills.api";
import { queryKeys } from "@/lib/query-keys";
import type {
    AddRhTalentSkillPayload,
    RhTalentSkillsResponse,
    UpdateRhTalentSkillPayload,
} from "@/types/rh-talent-skills.types";

export type RhTalentSkillsQueryCtx = {
    apiBase?: string;
    token?: string;
};

export function useRhTalentSkillsQuery(talentId: string | null | undefined, ctx: RhTalentSkillsQueryCtx) {
    const id = talentId?.trim() ?? "";
    return useQuery({
        queryKey: queryKeys.rh.talentSkills(id),
        queryFn: ({ signal }) => getTalentSkills(id, { token: ctx.token, signal }),
        enabled: Boolean(id),
        staleTime: 30_000,
    });
}

export type UseRhSkillsCatalogQueryOptions = {
    /** Ne charge le catalogue que si la modal add/edit est ouverte (évite 404 après ajout). */
    enabled?: boolean;
};

export function useRhSkillsCatalogQuery(
    ctx: RhTalentSkillsQueryCtx,
    options?: UseRhSkillsCatalogQueryOptions,
) {
    return useQuery({
        queryKey: queryKeys.rh.skillsCatalog(),
        queryFn: async ({ signal }) => {
            try {
                return await getSkillsCatalog({ token: ctx.token, signal });
            } catch (err) {
                console.warn("[RH Skills] Catalogue indisponible — saisie libre.", err);
                return [];
            }
        },
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

function invalidateTalentSkillsList(qc: ReturnType<typeof useQueryClient>, talentId: string) {
    void qc.invalidateQueries({ queryKey: queryKeys.rh.talentSkills(talentId) });
}

function invalidateTalentSkills(qc: ReturnType<typeof useQueryClient>, talentId: string) {
    invalidateTalentSkillsList(qc, talentId);
    void qc.invalidateQueries({ queryKey: queryKeys.rh.talentDetail(talentId) });
}

export type UseAddRhTalentSkillMutationOptions = {
    onSuccess?: () => void;
};

export function useAddRhTalentSkillMutation(
    talentId: string,
    ctx: RhTalentSkillsQueryCtx,
    options?: UseAddRhTalentSkillMutationOptions,
) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (payload: AddRhTalentSkillPayload) =>
            addTalentSkill(talentId, payload, { token: ctx.token }),
        onSuccess: () => {
            invalidateTalentSkillsList(qc, talentId);
            options?.onSuccess?.();
        },
    });
}

export function useUpdateRhTalentSkillMutation(talentId: string, ctx: RhTalentSkillsQueryCtx) {
    const qc = useQueryClient();
    const key = queryKeys.rh.talentSkills(talentId);

    return useMutation({
        mutationFn: ({ skillId, payload }: { skillId: string; payload: UpdateRhTalentSkillPayload }) =>
            updateTalentSkill(talentId, skillId, payload, { token: ctx.token }),
        onMutate: async ({ skillId, payload }) => {
            await qc.cancelQueries({ queryKey: key });
            const prev = qc.getQueryData<RhTalentSkillsResponse>(key);
            if (prev) {
                const skills = prev.skills.map((s) =>
                    s.id === skillId
                        ? {
                              ...s,
                              ...payload,
                              skill_name: payload.skill_name ?? s.skill_name,
                              proficiency_level: payload.proficiency_level ?? s.proficiency_level,
                          }
                        : s,
                );
                qc.setQueryData<RhTalentSkillsResponse>(key, { ...prev, skills });
            }
            return { prev };
        },
        onError: (_err, _vars, snap) => {
            if (snap?.prev) qc.setQueryData(key, snap.prev);
        },
        onSettled: () => invalidateTalentSkills(qc, talentId),
    });
}

export function useDeleteRhTalentSkillMutation(talentId: string, ctx: RhTalentSkillsQueryCtx) {
    const qc = useQueryClient();
    const key = queryKeys.rh.talentSkills(talentId);

    return useMutation({
        mutationFn: (skillId: string) =>
            deleteTalentSkill(talentId, skillId, { token: ctx.token }),
        onMutate: async (skillId) => {
            await qc.cancelQueries({ queryKey: key });
            const prev = qc.getQueryData<RhTalentSkillsResponse>(key);
            if (prev) {
                const skills = prev.skills.filter((s) => s.id !== skillId);
                qc.setQueryData<RhTalentSkillsResponse>(key, {
                    ...prev,
                    skills,
                    summary: prev.summary
                        ? { ...prev.summary, total: skills.length }
                        : undefined,
                });
            }
            return { prev };
        },
        onError: (_err, _skillId, snap) => {
            if (snap?.prev) qc.setQueryData(key, snap.prev);
        },
        onSettled: () => invalidateTalentSkills(qc, talentId),
    });
}

export { mapRhTalentSkillApiError };
