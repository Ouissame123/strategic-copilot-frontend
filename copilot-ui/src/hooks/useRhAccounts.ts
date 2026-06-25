import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    changeRhStaffPassword,
    createRhStaffAccount,
    createRhTalentAccount,
    deleteRhStaffAccount,
    deleteRhTalentAccount,
    fetchRhStaffAccountsList,
    fetchRhTalentAccountsList,
    mapRhAccountsApiError,
    toggleRhStaffStatus,
    toggleRhTalentStatus,
} from "@/api/rh-accounts.api";
import { ApiError } from "@/api/errors";
import { queryKeys } from "@/lib/query-keys";
import { readBackendMessage } from "@/lib/rh-accounts-display";
import { useToast } from "@/providers/toast-provider";
import type { CreateRhStaffAccountBody, CreateRhTalentAccountBody } from "@/types/rh-accounts.types";
import { getApiAuthToken } from "@/utils/apiClient";

export type UsersListFilters = {
    role: "all" | "manager" | "rh" | "admin";
    status: "active" | "disabled" | "inactive" | "all";
    search: string;
};

export type TalentsListFilters = {
    status: "active" | "inactive" | "all";
    search: string;
};

function mapApiErrorCode(err: unknown): string | undefined {
    if (!(err instanceof ApiError)) return undefined;
    const payload = err.payload;
    if (payload && typeof payload === "object" && "code" in payload) {
        return String((payload as { code?: string }).code);
    }
    return undefined;
}

export function useUsers(filters: UsersListFilters, enabled = true) {
    const token = getApiAuthToken();
    return useQuery({
        queryKey: queryKeys.rh.accountsUsers(filters),
        queryFn: () =>
            fetchRhStaffAccountsList({
                role: filters.role === "all" ? undefined : filters.role,
                status: filters.status === "all" ? undefined : filters.status,
                search: filters.search || undefined,
                limit: 200,
            }),
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
        enabled: enabled && Boolean(token),
    });
}

export function useTalents(filters: TalentsListFilters, enabled = true) {
    const token = getApiAuthToken();
    return useQuery({
        queryKey: queryKeys.rh.accountsTalents(filters),
        queryFn: () =>
            fetchRhTalentAccountsList({
                status: filters.status === "all" ? undefined : filters.status,
                search: filters.search || undefined,
                limit: 200,
            }),
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
        enabled: enabled && Boolean(token),
    });
}

export function useManagersList() {
    const token = getApiAuthToken();
    return useQuery({
        queryKey: queryKeys.rh.accountsManagers(),
        queryFn: () =>
            fetchRhStaffAccountsList({ role: "manager", status: "active", limit: 500 }),
        staleTime: 60_000,
        retry: false,
        enabled: Boolean(token),
    });
}

function invalidateAccounts(qc: ReturnType<typeof useQueryClient>) {
    void qc.invalidateQueries({ queryKey: queryKeys.rh.accounts() });
}

export function useCreateUser() {
    const qc = useQueryClient();
    const { push: toast } = useToast();
    return useMutation({
        mutationFn: (body: CreateRhStaffAccountBody) => createRhStaffAccount(body),
        onSuccess: (data) => {
            toast(data.message ?? readBackendMessage(data, "Compte créé."), "success", 6000, `${data.user.full_name} · ${data.user.email}`);
            invalidateAccounts(qc);
        },
        onError: (err) => {
            const code = mapApiErrorCode(err);
            if (code === "EMAIL_TAKEN") toast("Email déjà utilisé", "error", undefined, "Un autre compte utilise cet email.");
            else if (code === "VALIDATION_FAILED") toast("Champs invalides.", "error");
            else toast(mapRhAccountsApiError(err, "create-staff"), "error");
        },
    });
}

export function useCreateTalent() {
    const qc = useQueryClient();
    const { push: toast } = useToast();
    return useMutation({
        mutationFn: (body: CreateRhTalentAccountBody) => createRhTalentAccount(body),
        onSuccess: () => {
            toast("Talent créé.", "success");
            invalidateAccounts(qc);
        },
        onError: (err) => {
            const code = mapApiErrorCode(err);
            if (code === "EMAIL_TAKEN") toast("Cet email est déjà utilisé.", "error");
            else if (code === "VALIDATION_FAILED") toast("Champs invalides.", "error");
            else toast(mapRhAccountsApiError(err, "create-talent"), "error");
        },
    });
}

export function useChangePassword() {
    const { push: toast } = useToast();
    return useMutation({
        mutationFn: (vars: { userId: string; newPassword: string }) =>
            changeRhStaffPassword(vars.userId, vars.newPassword),
        onSuccess: (data) => {
            toast(readBackendMessage(data, "Mot de passe mis à jour."), "success");
        },
        onError: (err) => {
            const code = mapApiErrorCode(err);
            if (code === "WEAK_PASSWORD") toast("Mot de passe trop court (min 8).", "error");
            else toast(mapRhAccountsApiError(err, "change-password"), "error");
        },
    });
}

export function useToggleUserStatus() {
    const qc = useQueryClient();
    const { push: toast } = useToast();
    return useMutation({
        mutationFn: (vars: { userId: string }) => toggleRhStaffStatus(vars.userId),
        onSuccess: (data) => {
            toast(data.message ?? readBackendMessage(data, "Statut mis à jour."), "success");
            invalidateAccounts(qc);
        },
        onError: (err) => {
            const code = mapApiErrorCode(err);
            if (code === "VALIDATION_FAILED") {
                toast("Action interdite", "error", undefined, "Vous ne pouvez pas modifier votre propre statut.");
            } else {
                toast(mapRhAccountsApiError(err, "patch-staff"), "error");
            }
        },
    });
}

export function useDeleteUser() {
    const qc = useQueryClient();
    const { push: toast } = useToast();
    return useMutation({
        mutationFn: (vars: { userId: string }) => deleteRhStaffAccount(vars.userId),
        onSuccess: (data) => {
            const sr = data.cascade?.sessions_revoked ?? 0;
            const tu = data.cascade?.talents_unassigned ?? 0;
            toast(
                data.message ?? readBackendMessage(data, "Compte désactivé."),
                "success",
                8000,
                sr > 0 || tu > 0 ? `${sr} session(s) · ${tu} talent(s) désaffecté(s)` : undefined,
            );
            invalidateAccounts(qc);
            void qc.invalidateQueries({ queryKey: queryKeys.rh.talentsProfileRoot() });
        },
        onError: (err) => {
            const code = mapApiErrorCode(err);
            if (code === "SELF_DELETE_FORBIDDEN") {
                toast("Action interdite", "error", undefined, "Vous ne pouvez pas supprimer votre propre compte.");
            } else {
                toast(mapRhAccountsApiError(err, "delete-staff"), "error");
            }
        },
    });
}

export function useToggleTalentStatus() {
    const qc = useQueryClient();
    const { push: toast } = useToast();
    return useMutation({
        mutationFn: (vars: { talentId: string }) => toggleRhTalentStatus(vars.talentId),
        onSuccess: (data) => {
            toast(readBackendMessage(data, "Statut mis à jour."), "success");
            invalidateAccounts(qc);
        },
        onError: (err) => toast(mapRhAccountsApiError(err, "patch-talent"), "error"),
    });
}

export function useDeleteTalent() {
    const qc = useQueryClient();
    const { push: toast } = useToast();
    return useMutation({
        mutationFn: (vars: { talentId: string }) => deleteRhTalentAccount(vars.talentId),
        onSuccess: (data) => {
            toast(readBackendMessage(data, "Talent désactivé."), "success");
            invalidateAccounts(qc);
        },
        onError: (err) => toast(mapRhAccountsApiError(err, "delete-talent"), "error"),
    });
}
