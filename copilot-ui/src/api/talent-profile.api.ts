import { isAxiosError } from "axios";
import { httpClient } from "@/lib/http-client";
import { normalizeTalentProfileResponse } from "@/lib/talent-profile-normalize";
import type {
    ProfileResponse,
    TalentChangePasswordPayload,
    TalentChangePasswordResponse,
    TalentProfileUpdatePayload,
} from "@/types/talent-profile";
import type { ApiClientOptions } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

const BASE_PATH = "/webhook/talent/profile";

export class TalentProfileApiError extends Error {
    readonly httpStatus: number;
    readonly code?: string;

    constructor(message: string, httpStatus = 0, code?: string) {
        super(message);
        this.name = "TalentProfileApiError";
        this.httpStatus = httpStatus;
    }
}

function readErrorMessage(err: unknown, fallback: string): never {
    if (isAxiosError(err)) {
        const status = err.response?.status ?? 0;
        const root = unwrapN8nRoot(err.response?.data);
        const code = root.code != null ? String(root.code) : undefined;
        const message = String(root.message ?? root.error ?? fallback);
        throw new TalentProfileApiError(message, status, code);
    }
    if (err instanceof TalentProfileApiError) throw err;
    throw new TalentProfileApiError(err instanceof Error ? err.message : fallback);
}

export const talentProfileApi = {
    get: async (options?: ApiClientOptions): Promise<ProfileResponse> => {
        try {
            const { data } = await httpClient.get<unknown>(BASE_PATH, { signal: options?.signal });
            return normalizeTalentProfileResponse(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger le profil.");
        }
    },

    update: async (payload: TalentProfileUpdatePayload): Promise<void> => {
        try {
            await httpClient.patch(BASE_PATH, payload);
        } catch (err) {
            readErrorMessage(err, "Impossible de mettre à jour le profil.");
        }
    },

    changePassword: async (payload: TalentChangePasswordPayload): Promise<TalentChangePasswordResponse> => {
        try {
            const { data } = await httpClient.patch<unknown>(`${BASE_PATH}/password`, payload);
            return unwrapN8nRoot(data) as TalentChangePasswordResponse;
        } catch (err) {
            readErrorMessage(err, "Impossible de changer le mot de passe.");
        }
    },
};
