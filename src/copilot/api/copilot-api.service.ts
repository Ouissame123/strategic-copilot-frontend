import type { ApiClientOptions } from "@/utils/apiClient";
import { ApiError, apiPost } from "@/utils/apiClient";
import { copilotDecisionsUrl, copilotInsightsUrl } from "@/copilot/api/copilot-api.config";
import type { MappedCopilotBatchPayload, MappedDecisionPayload } from "@/copilot/api/map-copilot-response";
import { mapCopilotDecisionResponse, mapCopilotInsightsResponse } from "@/copilot/api/map-copilot-response";
import { parseCopilotDecisionResponse, parseCopilotInsightsResponse } from "@/copilot/api/copilot-api.parse";
import type { CopilotDecisionSubmitDto, CopilotInsightsRequestDto } from "@/copilot/api/copilot-api.types";

/**
 * Fetches insights: HTTP → parse (strict) → map → UI payload.
 * CopilotProvider must use this only — no direct DTOs in UI components.
 */
export async function fetchCopilotInsights(
    body: CopilotInsightsRequestDto,
    options?: ApiClientOptions,
): Promise<MappedCopilotBatchPayload> {
    const url = copilotInsightsUrl();
    if (!url) {
        throw new ApiError(
            "Copilot API is not configured (set VITE_COPILOT_API_BASE or VITE_COPILOT_INSIGHTS_URL).",
        );
    }
    const raw = await apiPost<unknown>(url, body, options);
    const dto = parseCopilotInsightsResponse(raw);
    return mapCopilotInsightsResponse(dto);
}

/**
 * Submits a user decision (optional backend sync). Returns mapped UI slice or null.
 */
export async function submitCopilotDecision(
    body: CopilotDecisionSubmitDto,
    options?: ApiClientOptions,
): Promise<MappedDecisionPayload | null> {
    const url = copilotDecisionsUrl();
    if (!url) return null;
    const raw = await apiPost<unknown>(url, body, options);
    const dto = parseCopilotDecisionResponse(raw);
    if (!dto) return null;
    return mapCopilotDecisionResponse(dto);
}

export function getCopilotFetchErrorMessage(err: unknown): string {
    if (err instanceof ApiError) return err.message;
    if (err instanceof Error) return err.message;
    return "Request failed.";
}
