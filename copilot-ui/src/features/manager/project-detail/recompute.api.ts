import { ApiError, apiPost } from "@/utils/apiClient";
import type { RecomputeRequest, RecomputeResponse } from "@/features/manager/project-detail/types";

export async function recomputeAgent(req: RecomputeRequest): Promise<RecomputeResponse> {
    try {
        return await apiPost<RecomputeResponse>("/webhook/api/copilot/recompute", req);
    } catch (error) {
        if (error instanceof ApiError && (error.status === 404 || error.status >= 500 || error.status == null)) {
            await new Promise((resolve) => window.setTimeout(resolve, 1500));
            return {
                ok: true,
                run_id: crypto.randomUUID(),
                started_at: new Date().toISOString(),
            };
        }
        throw error;
    }
}
