import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { passwordResetApi } from "@/api/password-reset.api";
import { useToast } from "@/providers/toast-provider";
import type { ResetPasswordRequest } from "@/types/password-reset.types";

export function useResetPassword() {
    const navigate = useNavigate();
    const { push } = useToast();

    return useMutation({
        mutationFn: (payload: ResetPasswordRequest) => passwordResetApi.reset(payload),
        onSuccess: (data) => {
            if (data.success) {
                push(data.message, "success");
                setTimeout(() => navigate("/login", { replace: true }), 1500);
            } else {
                push(data.message, "error");
            }
        },
        onError: () => {
            push("Erreur réseau. Réessayez.", "error");
        },
    });
}
