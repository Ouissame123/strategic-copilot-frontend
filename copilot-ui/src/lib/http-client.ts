import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { API_CONFIG } from "../config/api.config";
import { authStorage } from "./auth-storage";
import { applyRefreshedAuthTokens } from "./apply-refreshed-auth-tokens";
import { buildN8nUrl, getHttpClientBaseUrl } from "./build-n8n-url";
import { getApiAuthToken } from "@/utils/apiClient";
import { getStoredRefreshToken } from "@/utils/session-tokens";

/** Sur la config Axios : si true, pas d’événement `http:error` (toast global) — l’appelant affiche son propre message. */
export type HttpClientRequestConfig = AxiosRequestConfig & { skipGlobalHttpErrorToast?: boolean };

export const httpClient = axios.create({
    timeout: API_CONFIG.TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
});

httpClient.interceptors.request.use((config) => {
    const base = getHttpClientBaseUrl();
    config.baseURL = base.length > 0 ? base : "";
    const token = authStorage.getAccessToken()?.trim() || getApiAuthToken()?.trim() || null;
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

httpClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (
                originalRequest.url?.includes("/webhook/login") ||
                originalRequest.url?.includes("/webhook/refresh")
            ) {
                return Promise.reject(error);
            }
            originalRequest._retry = true;

            if (isRefreshing) {
                return new Promise((resolve) => {
                    pendingRequests.push((newToken: string) => {
                        originalRequest.headers = originalRequest.headers ?? {};
                        (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
                        resolve(httpClient(originalRequest));
                    });
                });
            }

            isRefreshing = true;
            try {
                const refreshToken = authStorage.getRefreshToken() ?? getStoredRefreshToken();
                if (!refreshToken) throw new Error("No refresh token");
                const { data } = await axios.post<Record<string, unknown>>(buildN8nUrl("/webhook/refresh"), { refreshToken });

                const access = applyRefreshedAuthTokens(data);
                if (!access) throw new Error("No access token in refresh response");

                pendingRequests.forEach((cb) => cb(access));
                pendingRequests = [];

                originalRequest.headers = originalRequest.headers ?? {};
                (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${access}`;
                return httpClient(originalRequest);
            } catch (refreshError) {
                authStorage.clear();
                window.location.href = "/login";
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        const cfg = originalRequest as HttpClientRequestConfig | undefined;
        const skipGlobalToast = Boolean(cfg?.skipGlobalHttpErrorToast);
        if (!skipGlobalToast && (error.response?.status === 403 || (error.response?.status ?? 0) >= 500)) {
            window.dispatchEvent(
                new CustomEvent("http:error", { detail: { status: error.response?.status } }),
            );
        }

        return Promise.reject(error);
    },
);

