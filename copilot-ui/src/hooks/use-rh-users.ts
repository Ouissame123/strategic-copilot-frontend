import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createRhUser,
    deleteRhUser,
    listRhUsers,
    patchRhUser,
} from "@/api/rh-users.api";
import { ApiError } from "@/api/errors";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type { RhUserCreateInput, RhUserPatchInput, RhUsersListFilters } from "@/types/rh-users.types";
import { getApiAuthToken } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function readUsersError(err: unknown): { code?: string; message: string; errors: string[] } {
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

function invalidateUsersQueries(qc: ReturnType<typeof useQueryClient>) {
    void qc.invalidateQueries({ queryKey: queryKeys.rh.usersRoot() });
    void qc.invalidateQueries({ queryKey: queryKeys.rh.accounts() });
}

/** GET — liste managers/RH/admin */
export function useRhUsers(filters: RhUsersListFilters = {}, enabled = true) {
    const token = getApiAuthToken();

    return useQuery({
        queryKey: queryKeys.rh.users(filters),
        queryFn: () => listRhUsers(filters),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
        enabled: enabled && Boolean(token),
    });
}

/** POST — créer manager ou RH */
export function useCreateRhUser() {
    const qc = useQueryClient();
    const { push: toast } = useToast();

    return useMutation({
        mutationFn: (input: RhUserCreateInput) => createRhUser(input),
        retry: false,
        onSuccess: (data) => {
            invalidateUsersQueries(qc);
            toast(data.message, "success", 6000, `${data.user.full_name} · ${data.user.email}`);
        },
        onError: (err: unknown) => {
            const { code, message, errors } = readUsersError(err);
            if (code === "EMAIL_TAKEN") {
                toast("Email déjà utilisé", "error", undefined, "Un autre compte utilise cet email.");
            } else if (errors.length) {
                toast(errors.join(" · "), "error");
            } else {
                toast(message, "error");
            }
        },
    });
}

/** PATCH — change_password | toggle_status */
export function usePatchRhUser() {
    const qc = useQueryClient();
    const { push: toast } = useToast();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: RhUserPatchInput }) => patchRhUser(id, input),
        retry: false,
        onSuccess: (data) => {
            invalidateUsersQueries(qc);
            const sr = data.sessions_revoked;
            const desc =
                data.operation === "change_password"
                    ? `${data.user.full_name} doit se reconnecter`
                    : data.user.status === "active"
                      ? `${data.user.full_name} → actif`
                      : `${data.user.full_name} → désactivé${sr > 0 ? ` (${sr} session(s) révoquée(s))` : ""}`;
            toast(data.message, "success", 6000, desc);
        },
        onError: (err: unknown) => {
            const { message, errors } = readUsersError(err);
            toast(errors.length ? errors.join(" · ") : message, "error");
        },
    });
}

/** DELETE — soft delete + cascade */
export function useDeleteRhUser() {
    const qc = useQueryClient();
    const { push: toast } = useToast();

    return useMutation({
        mutationFn: (id: string) => deleteRhUser(id),
        retry: false,
        onSuccess: (data) => {
            invalidateUsersQueries(qc);
            void qc.invalidateQueries({ queryKey: queryKeys.rh.talentsProfileRoot() });
            const sr = data.cascade.sessions_revoked;
            const tu = data.cascade.talents_unassigned;
            toast(
                data.message,
                "success",
                8000,
                `${data.user.full_name} · ${sr} session(s) révoquée(s) · ${tu} talent(s) désaffecté(s)`,
            );
        },
        onError: (err: unknown) => {
            const { code, message } = readUsersError(err);
            if (code === "SELF_DELETE_FORBIDDEN") {
                toast("Action interdite", "error", undefined, "Vous ne pouvez pas supprimer votre propre compte.");
            } else {
                toast(message, "error");
            }
        },
    });
}
