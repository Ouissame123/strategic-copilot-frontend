import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router";
import { TalentProfileApiError, talentProfileApi } from "@/api/talent-profile.api";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import type { TalentChangePasswordPayload, TalentProfileUpdatePayload } from "@/types/talent-profile";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export function useTalentProfile() {
    return useQuery({
        queryKey: queryKeys.talent.profile(),
        queryFn: ({ signal }) => talentProfileApi.get({ signal }),
        retry: false,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useUpdateTalentProfile() {
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: (payload: TalentProfileUpdatePayload) => talentProfileApi.update(payload),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.talent.profile() });
            push("Profil mis à jour", "success");
        },
        onError: (err: unknown) => {
            if (err instanceof TalentProfileApiError) {
                push(err.message, "error");
                return;
            }
            push(err instanceof Error ? err.message : "Erreur", "error");
        },
    });
}

export function useTalentChangePassword() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { push } = useToast();

    return useMutation({
        mutationFn: (payload: TalentChangePasswordPayload) => talentProfileApi.changePassword(payload),
        onSuccess: () => {
            push("Mot de passe changé — reconnecte-toi", "success");
            setTimeout(() => {
                void logout().finally(() => navigate("/login", { replace: true }));
            }, 1500);
        },
        onError: (err: unknown) => {
            if (err instanceof TalentProfileApiError && err.code === "WRONG_OLD_PASSWORD") {
                push("Ancien mot de passe incorrect", "error");
                return;
            }
            if (isAxiosError(err)) {
                const root = unwrapN8nRoot(err.response?.data);
                const code = root.code != null ? String(root.code) : undefined;
                if (code === "WRONG_OLD_PASSWORD") {
                    push("Ancien mot de passe incorrect", "error");
                    return;
                }
                push(String(root.message ?? root.error ?? "Erreur"), "error");
                return;
            }
            push(err instanceof Error ? err.message : "Erreur", "error");
        },
    });
}
