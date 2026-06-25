import { httpClient } from "@/lib/http-client";
import type {
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
} from "@/types/password-reset.types";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

const FORGOT_PASSWORD_PATH = "/webhook/auth/forgot-password";
const RESET_PASSWORD_PATH = "/webhook/auth/reset-password";

/** Pass-through strict backend — retourne le JSON tel quel (200 ou 400). */
async function postPasswordReset<T>(path: string, body: unknown): Promise<T> {
    const { data } = await httpClient.post<unknown>(path, body, {
        skipGlobalHttpErrorToast: true,
        validateStatus: () => true,
    });
    return unwrapN8nRoot(data) as T;
}

export const passwordResetApi = {
    forgot: (payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> =>
        postPasswordReset(FORGOT_PASSWORD_PATH, payload),

    reset: (payload: ResetPasswordRequest): Promise<ResetPasswordResponse> =>
        postPasswordReset(RESET_PASSWORD_PATH, payload),
};
