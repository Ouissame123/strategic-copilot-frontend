import { isAxiosError } from "axios";
import { httpClient } from "@/lib/http-client";
import { normalizeTalentDashboard } from "@/lib/talent-dashboard-normalize";
import type { TalentDashboard } from "@/types/talent-dashboard";
import type { ApiClientOptions } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

const TALENT_DASHBOARD_PATH = "/webhook/talent/dashboard";

export class TalentDashboardApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, httpStatus = 0) {
        super(message);
        this.name = "TalentDashboardApiError";
        this.httpStatus = httpStatus;
    }
}

function readErrorMessage(err: unknown, fallback: string): never {
    if (isAxiosError(err)) {
        const status = err.response?.status ?? 0;
        const root = unwrapN8nRoot(err.response?.data);
        const message = String(root.message ?? root.error ?? fallback);
        throw new TalentDashboardApiError(message, status);
    }
    if (err instanceof TalentDashboardApiError) throw err;
    throw new TalentDashboardApiError(err instanceof Error ? err.message : fallback);
}

export const talentDashboardApi = {
    get: async (options?: ApiClientOptions): Promise<TalentDashboard> => {
        try {
            const { data } = await httpClient.get<unknown>(TALENT_DASHBOARD_PATH, { signal: options?.signal });
            return normalizeTalentDashboard(data);
        } catch (err) {
            readErrorMessage(err, "Impossible de charger le dashboard talent.");
        }
    },
};
