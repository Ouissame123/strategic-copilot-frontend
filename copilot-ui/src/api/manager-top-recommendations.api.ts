import { httpClient } from "@/lib/http-client";
import { API_ROUTES } from "@/lib/api-routes";
import { normalizeManagerTopRecommendations } from "@/features/manager/lib/ai-recommendation-normalize";
import type { ManagerTopRecommendationsResponse } from "@/features/manager/types/ai-recommendation";

export const managerTopRecommendationsApi = {
    list: () =>
        httpClient.get<ManagerTopRecommendationsResponse>(API_ROUTES.managerTopRecommendations()).then((response) => ({
            ...response,
            data: normalizeManagerTopRecommendations(response.data),
        })),
};
