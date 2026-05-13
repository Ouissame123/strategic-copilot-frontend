import { httpClient } from "../lib/http-client";
import type { DashboardResponse } from "../types/api.types";

export const managerDashboardApi = {
    get: (scope?: "mine" | "enterprise") =>
        httpClient.get<DashboardResponse>("/webhook/manager/dashboard", { params: { scope } }),
};
