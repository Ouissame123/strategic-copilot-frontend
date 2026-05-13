import { httpClient } from "../lib/http-client";
import type {
    ViabilityRequest,
    ViabilityResponse,
    WhatIfModifications,
    WhatIfResponse,
} from "../types/api.types";

function toFiniteNumber(value: unknown): number | null {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}

/** Formulaires peuvent omettre allocation_pct → 0 */
function sanitizeModifications(m: Partial<WhatIfModifications>): WhatIfModifications {
    const allocation = toFiniteNumber(m.allocation_pct);
    const allocation_pct =
        allocation != null ? Math.min(200, Math.max(0, allocation)) : 0;

    let added_talent_id: string | null | undefined = m.added_talent_id;
    if (typeof added_talent_id === "string") {
        const t = added_talent_id.trim();
        if (!t.length) {
            added_talent_id = null;
        } else {
            const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
            // N’envoyer un talent qu’en UUID : un nom (ex. bug données) provoque des 500 côté Orchestrator.
            added_talent_id = uuid ? t : null;
        }
    }

    let training_skill_id: string | null | undefined = m.training_skill_id;
    if (typeof training_skill_id === "string") {
        const t = training_skill_id.trim();
        training_skill_id = t.length ? t : null;
    }

    const out: WhatIfModifications = { allocation_pct };
    if (added_talent_id != null) out.added_talent_id = added_talent_id;
    if (training_skill_id != null) out.training_skill_id = training_skill_id;
    const delay = toFiniteNumber(m.delay_days);
    if (delay != null) out.delay_days = delay;

    return out;
}

export interface CopilotRecomputeResponse {
    success?: boolean;
    status?: string;
    [key: string]: unknown;
}

export const orchestratorApi = {
    computeViability: (body: ViabilityRequest) => httpClient.post<ViabilityResponse>("/webhook/api/project/viability", body),

    /**
     * POST /webhook/api/project/what-if — JWT via httpClient.
     * Body : { project_id, modifications } (pas d’enterprise_id côté client).
     */
    whatIf: (projectId: string, modifications: Partial<WhatIfModifications>) => {
        const body = {
            project_id: projectId,
            modifications: sanitizeModifications(modifications),
        };
        return httpClient.post<WhatIfResponse>("/webhook/api/project/what-if", body);
    },

    /** POST /webhook/api/copilot/recompute — relance analyses / scores projet (JWT). */
    recomputeFull: (projectId: string) =>
        httpClient.post<CopilotRecomputeResponse>("/webhook/api/copilot/recompute", { project_id: projectId }),
};
