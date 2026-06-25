import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    grantPortalAccess,
    listUnlinkedTalents,
    onboardTalent,
    toLegacyOnboardResponse,
} from "@/api/rh-portal-access.api";
import { ApiError } from "@/api/errors";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type { GrantAccessInput, OnboardTalentInput } from "@/types/rh-portal-access.types";
import type { OnboardTalentResponse } from "@/types/talent-onboard";
import { getApiAuthToken } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function readPortalAccessError(err: unknown): { code?: string; message: string; errors: string[] } {
    if (err instanceof ApiError) {
        const root = unwrapN8nRoot(err.payload);
        const errors = Array.isArray(root.errors) ? root.errors.map(String) : [];
        return {
            code: root.code != null ? String(root.code) : undefined,
            message: String(root.message ?? err.message),
            errors,
        };
    }
    return {
        message: err instanceof Error ? err.message : "Erreur",
        errors: [],
    };
}

function invalidatePortalAccessQueries(qc: ReturnType<typeof useQueryClient>) {
    void qc.invalidateQueries({ queryKey: queryKeys.rh.portalAccessUnlinkedRoot() });
    void qc.invalidateQueries({ queryKey: queryKeys.rh.talentsProfileRoot() });
    void qc.invalidateQueries({ queryKey: queryKeys.rh.usersRoot() });
    void qc.invalidateQueries({ queryKey: queryKeys.rh.accounts() });
    void qc.invalidateQueries({ queryKey: queryKeys.rh.accountsAuditRoot() });
}

export type UseUnlinkedTalentsParams = {
    search?: string;
    limit?: number;
};

/** GET talents sans compte portail */
export function useUnlinkedTalents(params: UseUnlinkedTalentsParams = {}, enabled = true) {
    const token = getApiAuthToken();
    const search = params.search?.trim() ?? "";

    return useQuery({
        queryKey: queryKeys.rh.portalAccessUnlinked({ search, limit: params.limit ?? 200 }),
        queryFn: () =>
            listUnlinkedTalents({
                search: search || undefined,
                limit: params.limit ?? 200,
            }),
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
        enabled: enabled && Boolean(token),
    });
}

/** POST onboard — nouveau talent + compte login */
export function useOnboardTalent() {
    const qc = useQueryClient();
    const { push: toast } = useToast();

    return useMutation({
        mutationFn: (input: OnboardTalentInput): Promise<OnboardTalentResponse> =>
            onboardTalent(input).then(toLegacyOnboardResponse),
        retry: false,
        onSuccess: (data) => {
            invalidatePortalAccessQueries(qc);
            toast(data.message, "success", 8000, `${data.talent.email} · ${data.login_info.portal_url}`);
        },
        onError: (err: unknown) => {
            const { code, message, errors } = readPortalAccessError(err);
            if (code === "EMAIL_TAKEN") {
                toast("Email déjà utilisé", "error", undefined, "Un compte ou talent a déjà cet email.");
            } else if (errors.length) {
                toast(errors.join(" · "), "error");
            } else {
                toast(message, "error");
            }
        },
    });
}

type GrantPortalAccessInput = {
    talentId?: string;
    talent_id?: string;
    password: string;
};

/** POST grant-access — talent existant, body `{ password }` uniquement */
export function useGrantPortalAccess() {
    const qc = useQueryClient();
    const { push: toast } = useToast();

    return useMutation({
        mutationFn: (input: GrantPortalAccessInput): Promise<OnboardTalentResponse> => {
            const talentId = (input.talentId ?? input.talent_id ?? "").trim();
            if (!talentId) throw new ApiError("Identifiant talent requis.", 400);
            return grantPortalAccess(talentId, { password: input.password }).then(toLegacyOnboardResponse);
        },
        retry: false,
        onSuccess: (data) => {
            invalidatePortalAccessQueries(qc);
            toast(data.message, "success", 8000, `${data.user.email} · ${data.login_info.portal_url}`);
        },
        onError: (err: unknown) => {
            const { code, message, errors } = readPortalAccessError(err);
            if (code === "ALREADY_HAS_ACCESS") {
                toast("Déjà un compte", "warning", undefined, "Ce talent a déjà un accès portail.");
            } else if (code === "EMAIL_TAKEN") {
                toast("Email pris", "error", undefined, "L'email du talent est utilisé par un autre compte.");
            } else if (code === "TALENT_NOT_FOUND") {
                toast("Talent introuvable", "error");
            } else if (code === "WEAK_PASSWORD") {
                toast("Mot de passe trop court", "error", undefined, "Minimum 8 caractères.");
            } else if (errors.length) {
                toast(errors.join(" · "), "error");
            } else {
                toast(message, "error");
            }
        },
    });
}

export function generateInitialPassword(length = 14): string {
    const chars = {
        upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
        lower: "abcdefghijkmnpqrstuvwxyz",
        digits: "23456789",
        special: "!@#$%&*+=",
    };

    const required = [
        chars.upper[Math.floor(Math.random() * chars.upper.length)]!,
        chars.lower[Math.floor(Math.random() * chars.lower.length)]!,
        chars.digits[Math.floor(Math.random() * chars.digits.length)]!,
        chars.special[Math.floor(Math.random() * chars.special.length)]!,
    ];

    const all = Object.values(chars).join("");
    const rest = Array.from({ length: length - 4 }, () => all[Math.floor(Math.random() * all.length)]!);

    return [...required, ...rest].sort(() => Math.random() - 0.5).join("");
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

export type { OnboardTalentInput, GrantAccessInput };
