import { useMutation } from "@tanstack/react-query";
import { changeRhStaffPassword, mapRhAccountsApiError } from "@/api/rh-accounts.api";
import { ApiError } from "@/api/errors";
import { readBackendMessage } from "@/lib/rh-accounts-display";
import { useToast } from "@/providers/toast-provider";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function readResetPasswordError(err: unknown): { code?: string; message: string } {
    if (err instanceof ApiError) {
        const root = unwrapN8nRoot(err.payload);
        const code = root.code != null ? String(root.code) : undefined;
        if (code === "USER_NOT_FOUND" || err.status === 404) {
            return { code, message: "Compte utilisateur introuvable pour ce talent." };
        }
        return {
            code,
            message: mapRhAccountsApiError(err, "change-password"),
        };
    }
    return {
        message: err instanceof Error ? err.message : "Erreur lors de la réinitialisation",
    };
}

export function useResetTalentPassword() {
    const { push: toast } = useToast();

    return useMutation({
        mutationFn: ({ user_id, new_password }: { user_id: string; new_password: string }) =>
            changeRhStaffPassword(user_id, new_password),
        retry: false,
        onSuccess: (data) => {
            toast(readBackendMessage(data, "Mot de passe réinitialisé"), "success");
        },
        onError: (err: unknown) => {
            const { message } = readResetPasswordError(err);
            toast(message, "error");
        },
    });
}
