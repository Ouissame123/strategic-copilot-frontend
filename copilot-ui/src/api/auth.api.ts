import { httpClient } from "../lib/http-client";
import type {
    LoginRequest, LoginResponse, LogoutResponse, MeResponse, RefreshRequest, UpdateMeRequest, UpdatePasswordRequest, UpdatePasswordResponse,
} from "../types/api.types";

export const authApi = {
    login: (body: LoginRequest) => httpClient.post<LoginResponse>("/webhook/login", body),
    refresh: (body: RefreshRequest) => httpClient.post<LoginResponse>("/webhook/refresh", body),
    logout: (refreshToken: string) => httpClient.post<LogoutResponse>("/webhook/logout", { refreshToken }),
    getMe: () => httpClient.get<MeResponse>("/webhook/auth/me", { skipGlobalHttpErrorToast: true }),
    updateMe: (body: UpdateMeRequest) => httpClient.patch<MeResponse>("/webhook/auth/me", body),
    updatePassword: (body: UpdatePasswordRequest) => httpClient.patch<UpdatePasswordResponse>("/webhook/auth/me/password", body),
};
