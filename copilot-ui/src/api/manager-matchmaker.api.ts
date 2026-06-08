/**
 * WF Manager Matchmaker — POST /webhook/api/project/talents
 * Body : project_id, enterprise_id, manager_id, top_n, simulation_mode, use_ai
 */
import { buildRhTalentsAuthHeaders } from "@/api/rh-talents.api";
import {
    MANAGER_MATCHMAKER_TOP_N,
    MANAGER_PROJECT_TALENTS_URL,
} from "@/api/manager-matchmaker.constants";
import { normalizeProjectTalentMatchingResponse } from "@/lib/manager-matchmaker-normalize";
import type {
    ManagerProjectTalentMatchingBody,
    ManagerProjectTalentMatchingResult,
} from "@/types/manager-matchmaker.types";
import type { ApiClientOptions } from "@/utils/apiClient";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export type ManagerMatchmakerFetchOptions = ApiClientOptions & {
    token?: string | null;
    projectName?: string;
};

export class ManagerMatchmakerApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, httpStatus = 0) {
        super(message);
        this.name = "ManagerMatchmakerApiError";
        this.httpStatus = httpStatus;
    }
}

export function mapManagerMatchmakerApiError(err: unknown): string {
    if (err instanceof ManagerMatchmakerApiError) {
        if (err.httpStatus === 401) return "Session expirée ou token manquant. Reconnectez-vous.";
        if (err.httpStatus === 403) return "Accès refusé pour l’agent Matchmaker.";
        return err.message;
    }
    return err instanceof Error ? err.message : "Impossible de charger les données Matchmaker.";
}

function buildBody(
    projectId: string,
    enterpriseId: string,
    managerId: string,
): ManagerProjectTalentMatchingBody {
    const project_id = projectId?.trim();
    const enterprise_id = enterpriseId?.trim();
    const manager_id = managerId?.trim();
    if (!project_id) {
        throw new ManagerMatchmakerApiError("project_id manquant — appel Matchmaker annulé.");
    }
    if (!enterprise_id || !manager_id) {
        throw new ManagerMatchmakerApiError("Contexte manager incomplet (enterprise_id ou manager_id manquant).");
    }
    return {
        project_id,
        enterprise_id,
        manager_id,
        top_n: MANAGER_MATCHMAKER_TOP_N,
        simulation_mode: false,
        use_ai: true,
    };
}

export async function runProjectTalentMatching(
    projectId: string,
    enterpriseId: string,
    managerId: string,
    options?: ManagerMatchmakerFetchOptions,
): Promise<ManagerProjectTalentMatchingResult> {
    const url =
        (import.meta.env.VITE_MANAGER_PROJECT_TALENTS_URL as string | undefined)?.trim() ||
        MANAGER_PROJECT_TALENTS_URL;
    const body = buildBody(projectId, enterpriseId, managerId);

    if (import.meta.env.DEV) console.log("[Manager Matchmaker] POST project/talents", url, body);

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
        throw new ManagerMatchmakerApiError(
            String(root.message ?? root.error ?? `HTTP ${res.status}`),
            res.status,
        );
    }

    const parsed = normalizeProjectTalentMatchingResponse(
        json,
        projectId,
        options?.projectName ?? "",
    );
    if (!parsed) {
        throw new ManagerMatchmakerApiError(`Réponse matching invalide pour le projet ${projectId}`);
    }
    return parsed;
}
