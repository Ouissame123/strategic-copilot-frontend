/**
 * GET workflow « API talents » — liste enrichie (profil, compétences, etc.).
 */

import { ApiError, apiGet } from "@/utils/apiClient";
import { getTalentsWebhookListUrl } from "@/config/talents-webhook-api";

/** Champs normalisés pour l’affichage tabulaire ; toute autre clé backend est conservée. */
export type TalentsWebhookRow = Record<string, unknown> & {
    talent_id: string;
    name: string;
    email: string | null;
    role: string | null;
    contract_type: string | null;
    city: string | null;
    country: string | null;
    capacity_hours_per_week: string | null;
    manager_id: string | null;
    skills_count: string;
};

export interface TalentsWebhookListResult {
    items: TalentsWebhookRow[];
    total: number;
    /** Champs racine hors `items` / `total` (ex. status, message). */
    meta: Record<string, unknown>;
    /** Corps JSON complet pour audit. */
    raw: unknown;
}

function normalizeText(v: unknown): string | null {
    if (v == null) return null;
    const s = String(v).trim();
    if (s === "" || s.toLowerCase() === "null") return null;
    return s;
}

function normalizeSkillsCount(v: unknown): string {
    if (v == null) return "0";
    if (typeof v === "number" && Number.isFinite(v)) return String(Math.round(v));
    const t = normalizeText(v);
    return t ?? "0";
}

export async function fetchTalentsWebhookList(): Promise<TalentsWebhookListResult> {
    const raw = await apiGet<unknown>(getTalentsWebhookListUrl());
    if (!raw || typeof raw !== "object") {
        throw new ApiError("Réponse talents invalide.", 502);
    }
    const o = raw as Record<string, unknown>;
    if (o.status && String(o.status).toLowerCase() !== "success") {
        throw new ApiError(String(o.message ?? "Erreur backend talents"), 502);
    }
    const itemsRaw = Array.isArray(o.items) ? o.items : [];
    const total = typeof o.total === "number" && Number.isFinite(o.total) ? o.total : itemsRaw.length;

    const meta: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
        if (k !== "items" && k !== "total") meta[k] = v;
    }

    const items: TalentsWebhookRow[] = itemsRaw.map((row, index) => {
        const r = (row ?? {}) as Record<string, unknown>;
        const id = normalizeText(r.talent_id ?? r.id) ?? `talent-${index}`;
        const normalized: TalentsWebhookRow = {
            ...r,
            talent_id: id,
            name: normalizeText(r.name) ?? "—",
            email: normalizeText(r.email),
            role: normalizeText(r.role),
            contract_type: normalizeText(r.contract_type),
            city: normalizeText(r.city),
            country: normalizeText(r.country),
            capacity_hours_per_week: normalizeText(r.capacity_hours_per_week),
            manager_id: normalizeText(r.manager_id),
            skills_count: normalizeSkillsCount(r.skills_count),
        };
        return normalized;
    });

    return { items, total, meta, raw };
}
