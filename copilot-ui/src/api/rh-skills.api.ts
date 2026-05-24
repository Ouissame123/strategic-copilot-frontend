/**
 * WF_RH_Skills_Management — GET catalogue `VITE_RH_SKILLS_CATALOG_URL` ou `/webhook/rh/skills/catalog`.
 * Réponse : `{ status, catalog: [{ skill_name, skill_category, … }] }`.
 */
import { buildRhTalentsAuthHeaders } from "@/api/rh-talents.api";
import type { ApiClientOptions } from "@/utils/apiClient";
import { asRecord } from "@/utils/unwrap-api-payload";

export const RH_SKILLS_CATALOG_EMPTY_LABEL = "Aucune compétence dans le catalogue";

export type RhSkillsCatalogFetchOptions = ApiClientOptions & {
    token?: string | null;
};

export type RhSkillsCatalogOption = {
    value: string;
    label: string;
    category: string;
    talentCount: number;
    avgLevel: number;
    maxLevel: number;
};

export class RhSkillsCatalogApiError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RhSkillsCatalogApiError";
    }
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

/** URL catalogue — `VITE_RH_SKILLS_CATALOG_URL` ou proxy dev `/webhook/rh/skills/catalog`. */
export function resolveRhSkillsCatalogUrl(): string {
    const fromEnv = (import.meta.env.VITE_RH_SKILLS_CATALOG_URL as string | undefined)?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, "");
    return "/webhook/rh/skills/catalog";
}

/** Extrait uniquement `catalog` (pas `skills` / `data` / `items`). */
export function extractCatalogFromResponse(raw: unknown): unknown[] {
    const root = asRecord(raw);
    const catalog = root.catalog;
    return Array.isArray(catalog) ? catalog : [];
}

export function mapCatalogRowsToOptions(catalog: unknown[]): RhSkillsCatalogOption[] {
    return catalog
        .map((row): RhSkillsCatalogOption | null => {
            const r = asRecord(row);
            const skill_name = str(r.skill_name);
            if (!skill_name) return null;
            return {
                value: skill_name,
                label: skill_name,
                category: str(r.skill_category) || "",
                talentCount: num(r.talent_count, 0),
                avgLevel: num(r.avg_level, 0),
                maxLevel: num(r.max_level, 5),
            };
        })
        .filter((x): x is RhSkillsCatalogOption => x != null);
}

/** GET catalogue compétences RH → options pour le select. */
export async function getSkillsCatalog(options?: RhSkillsCatalogFetchOptions): Promise<RhSkillsCatalogOption[]> {
    const url = resolveRhSkillsCatalogUrl();
    console.log("[RH Skills Catalog] URL", url);

    let res: Response;
    try {
        res = await fetch(url, {
            headers: buildRhTalentsAuthHeaders(options?.token),
            credentials: "omit",
            signal: options?.signal,
        });
    } catch (err) {
        console.warn("[RH Skills Catalog] Réseau indisponible — saisie libre.", err);
        return [];
    }

    if (!res.ok) {
        console.warn(`[RH Skills Catalog] HTTP ${res.status} — saisie libre.`, url);
        return [];
    }

    let json: unknown = {};
    try {
        json = await res.json();
    } catch {
        return [];
    }

    console.log("[RH Skills Catalog RAW]", json);

    const catalog = extractCatalogFromResponse(json);
    const mapped = mapCatalogRowsToOptions(catalog);
    console.log("[RH Skills Catalog OPTIONS]", mapped);

    return mapped;
}

/** @deprecated Utiliser le retour direct de `getSkillsCatalog`. */
export function mapCatalogSkillsToOptions(options: RhSkillsCatalogOption[]): RhSkillsCatalogOption[] {
    return options;
}
