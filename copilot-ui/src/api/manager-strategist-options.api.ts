import { isAxiosError } from "axios";
import { normalizeExecuteResponse, strategistApi, StrategistApiError } from "@/api/strategist.api";
import type { ExecuteRequest, ExecuteResponse } from "@/types/api.types";

export type StrategistAction = "execute" | "reject";
export type StrategistExecuteResponse = ExecuteResponse;

export type StrategistExecuteParams = {
    enterpriseId: string;
    optionId: string;
    action?: StrategistAction;
    actorUserId?: string;
    orchestratorRunId?: string;
};

export function getStrategistExecuteErrorCode(err: unknown): string | undefined {
    if (err instanceof StrategistApiError) return err.code?.toUpperCase();
    if (!isAxiosError(err)) return undefined;
    const data = err.response?.data;
    if (data && typeof data === "object") {
        const o = data as Record<string, unknown>;
        const code = o.code ?? o.error;
        if (code != null) return String(code).trim().toUpperCase();
    }
    return undefined;
}

export const managerStrategistApi = {
    execute: (params: StrategistExecuteParams) => {
        const body: ExecuteRequest = {
            enterprise_id: params.enterpriseId.trim(),
            option_id: params.optionId.trim(),
            action: params.action ?? "execute",
            actor_user_id: params.actorUserId?.trim() || undefined,
            orchestrator_run_id: params.orchestratorRunId?.trim() || undefined,
        };
        return strategistApi.execute(body).then((r) => ({
            data: normalizeExecuteResponse(r.data) as StrategistExecuteResponse,
        }));
    },
};
