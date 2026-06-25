import { isAxiosError } from "axios";
import { httpClient, type HttpClientRequestConfig } from "@/lib/http-client";
import type { WhatIfModifications, WhatIfRequest, WhatIfResponse } from "@/api/whatif.types";

export const WHAT_IF_PATH = "/webhook/api/project/what-if";

const silent: HttpClientRequestConfig = { skipGlobalHttpErrorToast: true };

export function getWhatIfErrorCode(err: unknown): string | undefined {
    if (!isAxiosError(err)) return undefined;
    const status = err.response?.status;
    if (status === 404) return "baseline_missing";
    if (status === 403) return "forbidden";
    if (status === 400) return "validation_failed";
    if (status === 500) return "orchestrator_error";

    const data = err.response?.data;
    if (data && typeof data === "object") {
        const o = data as Record<string, unknown>;
        const code = o.code ?? o.error;
        if (code != null) return String(code).trim().toLowerCase();
        const message = String(o.message ?? "").toLowerCase();
        if (message.includes("baseline")) return "baseline_missing";
    }
    return undefined;
}

export function sanitizeWhatIfModifications(modifications: WhatIfModifications): WhatIfModifications {
    const allocation = Number(modifications.allocation_pct);
    const body: WhatIfModifications = {
        allocation_pct: Number.isFinite(allocation) ? Math.min(200, Math.max(0, allocation)) : 0,
        added_talent_id: null,
        training_skill_id: null,
    };
    const talent = modifications.added_talent_id;
    if (typeof talent === "string" && talent.trim()) body.added_talent_id = talent.trim();
    const skill = modifications.training_skill_id;
    if (typeof skill === "string" && skill.trim()) body.training_skill_id = skill.trim();
    return body;
}

export async function runWhatIfSimulation(req: WhatIfRequest): Promise<WhatIfResponse> {
    const { data } = await httpClient.post<WhatIfResponse>(
        WHAT_IF_PATH,
        {
            project_id: req.project_id.trim(),
            modifications: sanitizeWhatIfModifications(req.modifications),
        },
        silent,
    );
    return data;
}

/** @deprecated Préférer `runWhatIfSimulation` */
export const managerWhatIfApi = {
    simulate: (projectId: string, modifications: WhatIfModifications) =>
        runWhatIfSimulation({
            project_id: projectId,
            modifications: {
                allocation_pct: modifications.allocation_pct,
                added_talent_id: modifications.added_talent_id ?? null,
                training_skill_id: modifications.training_skill_id ?? null,
            },
        }).then((data) => ({ data })),
};

export type { WhatIfModifications as ManagerWhatIfModifications };
export type ManagerWhatIfResponse = WhatIfResponse;
export type WhatIfBreakdown = import("@/api/whatif.types").ScoreBreakdown;
