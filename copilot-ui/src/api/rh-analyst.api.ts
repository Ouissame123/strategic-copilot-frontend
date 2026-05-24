/**
 * WF Analyst RH — POST /webhook/api/analyst/ipi & /webhook/api/analyst/nine-box
 */
import { buildRhTalentsAuthHeaders } from "@/api/rh-talents.api";
import { extractNineBoxGridPayload, normalizeRhNineBoxFromGrid } from "@/lib/rh-analyst-nine-box";
import { buildN8nUrl } from "@/lib/build-n8n-url";
import type {
    RhAnalystFetchBody,
    RhAnalystInsightsResult,
    RhAnalystIpiDistribution,
    RhAnalystIpiResponse,
    RhAnalystNineBoxResponse,
    RhAnalystTopTalentRow,
} from "@/types/rh-analyst.types";
import type { ApiClientOptions } from "@/utils/apiClient";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export const RH_ANALYST_IPI_URL = buildN8nUrl("/webhook/api/analyst/ipi");
export const RH_ANALYST_NINE_BOX_URL = buildN8nUrl("/webhook/api/analyst/nine-box");

export type RhAnalystFetchOptions = ApiClientOptions & {
    token?: string | null;
};

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function recordNumbers(raw: unknown): Record<string, number> {
    const o = asRecord(raw);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(o)) {
        out[k] = num(v);
    }
    return out;
}

function parseIpiDistribution(raw: unknown): RhAnalystIpiDistribution {
    const r = recordNumbers(raw);
    return {
        top: num(r.top ?? r.top_performers),
        strong: num(r.strong),
        average: num(r.average ?? r.avg),
        at_risk: num(r.at_risk ?? r.atRisk ?? r.risk),
    };
}

function parseTopTalentRow(row: unknown): RhAnalystTopTalentRow | null {
    const r = asRecord(row);
    const talent_name = str(r.talent_name ?? r.name ?? r.full_name);
    if (!talent_name) return null;
    return {
        talent_id: str(r.talent_id ?? r.id) || null,
        talent_name,
        ipi_score: num(r.ipi_score ?? r.ipi),
        ipi_band: str(r.ipi_band ?? r.band) || "average",
        workload_ratio: num(r.workload_ratio ?? r.allocation_pct ?? r.load_pct),
    };
}

export function normalizeRhAnalystIpiResponse(raw: unknown): RhAnalystIpiResponse | null {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") {
        throw new Error(str(root.message ?? root.error) || "Erreur analyse IPI");
    }
    const block = asRecord(root.data ?? root.ipi ?? root);
    const distRaw = block.distribution ?? root.distribution;
    const topRaw = block.top_talents ?? block.topTalents ?? root.top_talents ?? root.talents;
    const top_talents = Array.isArray(topRaw)
        ? topRaw.map(parseTopTalentRow).filter((x): x is RhAnalystTopTalentRow => x != null)
        : [];

    return {
        status: str(root.status) || undefined,
        avg_ipi: num(block.avg_ipi ?? root.avg_ipi ?? block.average_ipi),
        total_talents: num(block.total_talents ?? root.total_talents, top_talents.length),
        distribution: parseIpiDistribution(distRaw),
        top_talents,
    };
}

export function normalizeRhAnalystNineBoxResponse(raw: unknown): RhAnalystNineBoxResponse | null {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error") {
        throw new Error(str(root.message ?? root.error) || "Erreur analyse 9-Box");
    }

    const grid = extractNineBoxGridPayload(root, raw);
    const block = asRecord(root.data ?? root);
    const totalFromApi = num(block.total_talents ?? root.total_talents ?? root.total);

    return normalizeRhNineBoxFromGrid(grid, totalFromApi, str(root.status) || undefined);
}

export class RhAnalystApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, httpStatus = 0) {
        super(message);
        this.name = "RhAnalystApiError";
        this.httpStatus = httpStatus;
    }
}

async function postAnalystJson(url: string, body: RhAnalystFetchBody, options?: RhAnalystFetchOptions): Promise<unknown> {
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
        throw new RhAnalystApiError(
            str(root.message ?? root.error) || `HTTP ${res.status}`,
            res.status,
        );
    }

    return json;
}

/** POST IPI enterprise. */
export async function fetchRhAnalystIpi(
    enterpriseId: string,
    options?: RhAnalystFetchOptions,
): Promise<RhAnalystIpiResponse> {
    const eid = enterpriseId?.trim();
    if (!eid) throw new RhAnalystApiError("Identifiant entreprise requis");

    const url = (import.meta.env.VITE_RH_ANALYST_IPI_URL as string | undefined)?.trim() || RH_ANALYST_IPI_URL;
    if (import.meta.env.DEV) console.log("[RH Analyst] POST IPI", url);

    const json = await postAnalystJson(url, { enterprise_id: eid }, options);
    const data = normalizeRhAnalystIpiResponse(json);
    if (!data) throw new RhAnalystApiError("Réponse IPI invalide");
    return data;
}

/** POST 9-Box enterprise. */
export async function fetchRhAnalystNineBox(
    enterpriseId: string,
    options?: RhAnalystFetchOptions,
): Promise<RhAnalystNineBoxResponse> {
    const eid = enterpriseId?.trim();
    if (!eid) throw new RhAnalystApiError("Identifiant entreprise requis");

    const url =
        (import.meta.env.VITE_RH_ANALYST_NINE_BOX_URL as string | undefined)?.trim() ||
        RH_ANALYST_NINE_BOX_URL;
    if (import.meta.env.DEV) console.log("[RH Analyst] POST nine-box", url);

    const json = await postAnalystJson(url, { enterprise_id: eid }, options);
    const data = normalizeRhAnalystNineBoxResponse(json);
    if (!data) throw new RhAnalystApiError("Réponse 9-Box invalide");
    return data;
}

/** Les deux analyses en parallèle — n’échoue pas globalement si un endpoint est KO. */
export async function fetchRhAnalystInsights(
    enterpriseId: string,
    options?: RhAnalystFetchOptions,
): Promise<RhAnalystInsightsResult> {
    const [ipiSettled, nineBoxSettled] = await Promise.allSettled([
        fetchRhAnalystIpi(enterpriseId, options),
        fetchRhAnalystNineBox(enterpriseId, options),
    ]);

    return {
        ipi: ipiSettled.status === "fulfilled" ? ipiSettled.value : null,
        nineBox: nineBoxSettled.status === "fulfilled" ? nineBoxSettled.value : null,
        ipiError:
            ipiSettled.status === "rejected"
                ? ipiSettled.reason instanceof Error
                    ? ipiSettled.reason.message
                    : String(ipiSettled.reason)
                : null,
        nineBoxError:
            nineBoxSettled.status === "rejected"
                ? nineBoxSettled.reason instanceof Error
                    ? nineBoxSettled.reason.message
                    : String(nineBoxSettled.reason)
                : null,
    };
}
