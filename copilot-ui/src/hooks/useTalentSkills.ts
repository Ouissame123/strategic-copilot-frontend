import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { talentSkillsApi } from "@/api/talent-skills.api";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type { CreateSkillPayload, TalentSkillsListFilters, UpdateSkillPayload } from "@/types/talent-skills";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function readMutationError(err: unknown, fallback: string): string {
    if (isAxiosError(err)) {
        const root = unwrapN8nRoot(err.response?.data);
        return String(root.message ?? root.error ?? fallback);
    }
    return err instanceof Error ? err.message : fallback;
}

export function useTalentSkillsList(filters: TalentSkillsListFilters = {}) {
    return useQuery({
        queryKey: queryKeys.talent.skillsList(filters),
        queryFn: ({ signal }) => talentSkillsApi.list(filters, { signal }),
        retry: false,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useTalentSkillsSummary() {
    return useQuery({
        queryKey: queryKeys.talent.skillsSummary(),
        queryFn: ({ signal }) => talentSkillsApi.summary({ signal }),
        retry: false,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useTalentSkillsCatalog(search: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.talent.skillsCatalog(search),
        queryFn: ({ signal }) => talentSkillsApi.catalog(search, 50, { signal }),
        enabled,
        retry: false,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useTalentSkillsGaps(enabled = true) {
    return useQuery({
        queryKey: queryKeys.talent.skillsGaps(),
        queryFn: ({ signal }) => talentSkillsApi.gaps({ signal }),
        enabled,
        retry: false,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useAddSkill() {
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: (payload: CreateSkillPayload) => talentSkillsApi.create(payload),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.talent.skills() });
            push("Compétence ajoutée", "success");
        },
        onError: (err: unknown) => {
            push(readMutationError(err, "Erreur lors de l'ajout"), "error");
        },
    });
}

export function useUpdateSkill() {
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: ({ skillId, payload }: { skillId: string; payload: UpdateSkillPayload }) =>
            talentSkillsApi.update(skillId, payload),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.talent.skills() });
            push("Compétence mise à jour", "success");
        },
        onError: (err: unknown) => {
            push(readMutationError(err, "Erreur lors de la mise à jour"), "error");
        },
    });
}

export function useDeleteSkill() {
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: (skillId: string) => talentSkillsApi.delete(skillId),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.talent.skills() });
            push("Compétence supprimée", "success");
        },
        onError: (err: unknown) => {
            push(readMutationError(err, "Impossible de supprimer"), "error");
        },
    });
}
