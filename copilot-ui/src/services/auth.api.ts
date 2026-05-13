import { httpClient } from "@/lib/http-client";

export interface MeResponse {
    user: {
        id: string;
        enterprise_id: string;
        enterprise_name: string;
        full_name: string;
        email: string;
        /** URL publique de la photo (optionnel). */
        avatar_url?: string | null;
        role: "manager" | "rh" | "admin";
        status: "active" | "pending" | "suspended";
        must_change_password: boolean;
        password_expires_at: string | null;
        created_at: string;
        updated_at: string;
    };
    talent: null | {
        id: string;
        name: string;
        contract_end_date: string | null;
    };
}

export const authMeApi = {
    get: () => httpClient.get<MeResponse>("/webhook/auth/me", { skipGlobalHttpErrorToast: true }),
    updateProfile: (body: { full_name?: string; email?: string; avatar_url?: string }) =>
        httpClient.patch<{ user: MeResponse["user"] }>("/webhook/auth/me", body),
    changePassword: (body: { current_password: string; new_password: string }) =>
        httpClient.patch<{
            user: MeResponse["user"];
            security: { password_changed: boolean; requires_relogin: boolean };
        }>("/webhook/auth/me/password", body),
    logout: () => httpClient.post("/webhook/auth/logout"),
};
