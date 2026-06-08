/**
 * WF Manager Analyst — POST /webhook/api/analyst/{ipi|nine-box|mobility}
 * Body : { enterprise_id, manager_id }
 */
import { buildRhTalentsAuthHeaders } from "@/api/rh-talents.api";
import {
    MANAGER_ANALYST_IPI_URL,
    MANAGER_ANALYST_MOBILITY_URL,
    MANAGER_ANALYST_NINE_BOX_URL,
} from "@/api/manager-analyst.constants";
import {
    normalizeManagerAnalystIpi,
    normalizeManagerAnalystMobility,
    normalizeManagerAnalystNineBox,
} from "@/lib/manager-analyst-normalize";
import type {
    ManagerAnalystIpiResponse,
    ManagerAnalystMobilityResponse,
    ManagerAnalystNineBoxResponse,
    ManagerAnalystRequestBody,
} from "@/types/manager-analyst.types";
import type { ApiClientOptions } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export type ManagerAnalystFetchOptions = ApiClientOptions & {
    token?: string | null;
};

export class ManagerAnalystApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, httpStatus = 0) {
        super(message);
        this.name = "ManagerAnalystApiError";
        this.httpStatus = httpStatus;
    }
}

export function mapManagerAnalystApiError(err: unknown): string {
    if (err instanceof ManagerAnalystApiError) {
        if (err.httpStatus === 401) return "Session expirée ou token manquant. Reconnectez-vous.";
        if (err.httpStatus === 403) return "Accès refusé : rôle manager requis pour l’agent Analyst.";
        return err.message;
    }
    return err instanceof Error ? err.message : "Impossible de charger les données Analyst.";
}

function resolveBody(enterpriseId: string, managerId: string): ManagerAnalystRequestBody {
    const enterprise_id = enterpriseId?.trim();
    const manager_id = managerId?.trim();
    if (!enterprise_id || !manager_id) {
        throw new ManagerAnalystApiError("Contexte manager incomplet (enterprise_id ou manager_id manquant).");
    }
    return { enterprise_id, manager_id };
}

async function postManagerAnalyst<T>(
    url: string,
    body: ManagerAnalystRequestBody,
    normalize: (raw: unknown) => T | null,
    label: string,
    options?: ManagerAnalystFetchOptions,
): Promise<T> {
    if (import.meta.env.DEV) console.log(`[Manager Analyst] POST ${label}`, url, body);

    const res = await fetch(url, {
        method: "POST",
        headers: {
            ...buildRhTalentsAuthHeaders(options?.token),
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        credentials: "omit",
        signal: options?.signal,
        body: JSON.stringify(body),
    });

    let json: unknown = {};
    try {
        json = await res.json();
    } catch {
        json = {};
    }

    if (!res.ok) {
        const root = unwrapN8nRoot(json);
        throw new ManagerAnalystApiError(
            String(root.message ?? root.error ?? `HTTP ${res.status}`),
            res.status,
        );
    }

    const data = normalize(json);
    if (!data) throw new ManagerAnalystApiError(`Réponse ${label} invalide`);
    return data;
}

export async function getManagerAnalystIPI(
    enterpriseId: string,
    managerId: string,
    options?: ManagerAnalystFetchOptions,
): Promise<ManagerAnalystIpiResponse> {
    const url =
        (import.meta.env.VITE_MANAGER_ANALYST_IPI_URL as string | undefined)?.trim() || MANAGER_ANALYST_IPI_URL;
    const body = resolveBody(enterpriseId, managerId);
    return postManagerAnalyst(url, body, normalizeManagerAnalystIpi, "IPI", options);
}

export async function getManagerAnalystNineBox(
    enterpriseId: string,
    managerId: string,
    options?: ManagerAnalystFetchOptions,
): Promise<ManagerAnalystNineBoxResponse> {
    const url =
        (import.meta.env.VITE_MANAGER_ANALYST_NINE_BOX_URL as string | undefined)?.trim() ||
        MANAGER_ANALYST_NINE_BOX_URL;
    const body = resolveBody(enterpriseId, managerId);
    return postManagerAnalyst(url, body, normalizeManagerAnalystNineBox, "nine-box", options);
}

export async function getManagerAnalystMobility(
    enterpriseId: string,
    managerId: string,
    options?: ManagerAnalystFetchOptions,
): Promise<ManagerAnalystMobilityResponse> {
    const url =
        (import.meta.env.VITE_MANAGER_ANALYST_MOBILITY_URL as string | undefined)?.trim() ||
        MANAGER_ANALYST_MOBILITY_URL;
    const body = resolveBody(enterpriseId, managerId);
    return postManagerAnalyst(url, body, normalizeManagerAnalystMobility, "mobility", options);
}
