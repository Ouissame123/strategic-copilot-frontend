import { useMutation } from "@tanstack/react-query";
import { passwordResetApi } from "@/api/password-reset.api";
import { useToast } from "@/providers/toast-provider";
import type { ForgotPasswordRequest } from "@/types/password-reset.types";

export function useForgotPassword() {
    const { push } = useToast();

    return useMutation({
        mutationFn: (payload: ForgotPasswordRequest) => passwordResetApi.forgot(payload),
        onSuccess: (data) => {
            if (data.success) push(data.message, "success");
            else push(data.message, "error");
        },
        onError: () => {
            push("Erreur réseau. Réessayez.", "error");
        },
    });
}
