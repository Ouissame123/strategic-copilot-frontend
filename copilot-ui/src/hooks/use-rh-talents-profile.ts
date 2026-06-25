import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createTalentProfile,
    deleteTalentProfile,
    listTalentsProfile,
    toggleTalentProfileStatus,
} from "@/api/rh-talents-profile.api";
import { ApiError } from "@/api/errors";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type { TalentCreateInput, TalentsListFilters } from "@/types/rh-talents-profile.types";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function readError(err: unknown): { message: string; errors: string[]; code?: string } {
    if (err instanceof ApiError) {
        const root = unwrapN8nRoot(err.payload);
        const errors = Array.isArray(root.errors) ? root.errors.map(String) : [];
        return {
            code: root.code != null ? String(root.code) : undefined,
            message: String(root.message ?? err.message),
            errors,
        };
    }
    return { message: err instanceof Error ? err.message : "Erreur", errors: [] };
}

export function useTalentsProfile(filters: TalentsListFilters = {}) {
    return useQuery({
        queryKey: queryKeys.rh.talentsProfile(filters),
        queryFn: () => listTalentsProfile(filters),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });
}

export function useCreateTalentProfile() {
    const qc = useQueryClient();
    const { push: toast } = useToast();

    return useMutation({
        mutationFn: (input: TalentCreateInput) => createTalentProfile(input),
        onSuccess: (data) => {
            toast(data.message ?? "Profil talent créé", "success", 5000, `${data.talent.name} · ${data.talent.email}`);
            void qc.invalidateQueries({ queryKey: queryKeys.rh.talentsProfileRoot() });
            void qc.invalidateQueries({ queryKey: queryKeys.rh.accounts() });
        },
        onError: (err: unknown) => {
            const { message, errors, code } = readError(err);
            if (code === "EMAIL_TAKEN") {
                toast("Email déjà utilisé", "error");
                return;
            }
            toast(errors.length ? errors.join(" · ") : message, "error");
        },
    });
}

export function useToggleTalentProfile() {
    const qc = useQueryClient();
    const { push: toast } = useToast();

    return useMutation({
        mutationFn: (talentId: string) => toggleTalentProfileStatus(talentId),
        onSuccess: (data) => {
            toast(data.message, "success", 5000, `${data.talent.name} · ${data.talent.status}`);
            void qc.invalidateQueries({ queryKey: queryKeys.rh.talentsProfileRoot() });
            void qc.invalidateQueries({ queryKey: queryKeys.rh.accounts() });
            void qc.invalidateQueries({ queryKey: ["rh-assignments"] });
        },
        onError: (err: unknown) => {
            const { message } = readError(err);
            toast(message, "error");
        },
    });
}

export function useDeleteTalentProfile() {
    const qc = useQueryClient();
    const { push: toast } = useToast();

    return useMutation({
        mutationFn: (talentId: string) => deleteTalentProfile(talentId),
        onSuccess: (data) => {
            const n = data.cascade?.assignments_ended ?? 0;
            toast(
                data.message,
                "success",
                5000,
                n > 0 ? `${data.talent.name} · ${n} affectation(s) terminée(s)` : data.talent.name,
            );
            void qc.invalidateQueries({ queryKey: queryKeys.rh.talentsProfileRoot() });
            void qc.invalidateQueries({ queryKey: queryKeys.rh.accounts() });
            void qc.invalidateQueries({ queryKey: ["rh-assignments"] });
        },
        onError: (err: unknown) => {
            const { message } = readError(err);
            toast(message, "error");
        },
    });
}
