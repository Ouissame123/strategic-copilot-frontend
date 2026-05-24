/**
 * RH Absences — URLs n8n production via variables `VITE_RH_ABSENCES_*_URL`.
 */
import { buildRhTalentsAuthHeaders } from "@/api/rh-talents.api";
import { parseFlexibleDateToIso } from "@/lib/rh-date-iso";
import type {
    CreateRhTalentAbsencePayload,
    RhAbsenceStatus,
    RhAbsenceType,
    RhTalentAbsence,
    RhTalentAbsencesResponse,
    RhTalentAbsencesSummary,
} from "@/types/rh-absences.types";
import type { ApiClientOptions } from "@/utils/apiClient";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export type RhTalentAbsencesFetchOptions = ApiClientOptions & {
    token?: string | null;
};

const PLACEHOLDER_TALENT_IDS = new Set([":id", ":talent_id", "{id}", "{talentId}"]);
const PLACEHOLDER_ABSENCE_IDS = new Set([":id", ":absence_id", "{id}", "{absenceId}"]);

const TALENT_ID_RE = /\{id\}|\{talentId\}|:id|:talent_id/gi;
const ABSENCE_ID_RE = /\{id\}|\{absenceId\}|:id|:absence_id/gi;

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function messageFromBody(raw: unknown, fallback: string): string {
    const root = unwrapN8nRoot(raw);
    return str(root.message ?? root.error ?? root.detail) || fallback;
}

export class RhTalentAbsencesApiError extends Error {
    readonly httpStatus: number;

    constructor(message: string, options?: { httpStatus?: number }) {
        super(message);
        this.name = "RhTalentAbsencesApiError";
        this.httpStatus = options?.httpStatus ?? 0;
    }
}

export function mapRhTalentAbsencesApiError(err: unknown): string {
    if (err instanceof RhTalentAbsencesApiError) return err.message;
    return err instanceof Error ? err.message : "Erreur absences";
}

export function assertRhAbsenceTalentId(talentId: string): string {
    const id = talentId?.trim() ?? "";
    if (!id || PLACEHOLDER_TALENT_IDS.has(id)) {
        throw new RhTalentAbsencesApiError("Identifiant talent invalide.");
    }
    return id;
}

export function assertRhAbsenceId(absenceId: string): string {
    const id = absenceId?.trim() ?? "";
    if (!id || PLACEHOLDER_ABSENCE_IDS.has(id)) {
        throw new RhTalentAbsencesApiError("Identifiant absence invalide.");
    }
    return id;
}

function requireEnvUrl(key: string): string {
    const url = (import.meta.env as Record<string, string | undefined>)[key]?.trim();
    if (!url) {
        throw new RhTalentAbsencesApiError(`${key} manquant — configurez l’URL Production URL n8n.`);
    }
    return url;
}

function replaceIdInUrl(template: string, id: string, kind: "talent" | "absence"): string {
    const re = kind === "talent" ? TALENT_ID_RE : ABSENCE_ID_RE;
    const url = template.trim().replace(re, id);
    if (/\{id\}|\{talentId\}|\{absenceId\}|:id|:talent_id|:absence_id/i.test(url)) {
        throw new RhTalentAbsencesApiError("URL absences invalide — placeholder {id} non remplacé.");
    }
    return url;
}

export function rhTalentAbsencesGetUrl(talentId: string): string {
    const id = assertRhAbsenceTalentId(talentId);
    return replaceIdInUrl(requireEnvUrl("VITE_RH_ABSENCES_GET_URL"), id, "talent");
}

export function rhTalentAbsencesPostUrl(talentId: string): string {
    const id = assertRhAbsenceTalentId(talentId);
    return replaceIdInUrl(requireEnvUrl("VITE_RH_ABSENCES_POST_URL"), id, "talent");
}

export function rhTalentAbsencesDeleteUrl(absenceId: string): string {
    const id = assertRhAbsenceId(absenceId);
    return replaceIdInUrl(requireEnvUrl("VITE_RH_ABSENCES_DELETE_URL"), id, "absence");
}

export function rhAbsencesCurrentUrl(): string {
    return requireEnvUrl("VITE_RH_ABSENCES_CURRENT_URL").replace(/\/$/, "");
}

/** @deprecated Utiliser `rhTalentAbsencesDeleteUrl`. */
export function rhAbsenceDeleteUrl(absenceId: string): string {
    return rhTalentAbsencesDeleteUrl(absenceId);
}

/** @deprecated Utiliser `rhTalentAbsencesGetUrl`. */
export function rhTalentAbsencesUrl(talentId: string): string {
    return rhTalentAbsencesGetUrl(talentId);
}

function parseAbsenceStatus(raw: unknown): RhAbsenceStatus | string {
    const s = str(raw).toLowerCase();
    if (s === "current" || s === "upcoming" || s === "past") return s;
    if (s.includes("cours") || s === "en_cours") return "current";
    if (s.includes("venir") || s === "a_venir") return "upcoming";
    if (s.includes("pass")) return "past";
    return s || "past";
}

function parseAbsence(row: unknown): RhTalentAbsence | null {
    const r = asRecord(row);
    const id = str(r.id ?? r.absence_id);
    const start_date = str(r.start_date);
    if (!id || !start_date) return null;
    const endRaw = r.end_date;
    const end_date = endRaw == null || endRaw === "" ? null : str(endRaw);
    return {
        id,
        absence_type: (str(r.absence_type) || "other") as RhAbsenceType,
        start_date,
        end_date,
        duration_days: r.duration_days != null ? num(r.duration_days) : r.duration != null ? num(r.duration) : null,
        status: parseAbsenceStatus(r.status ?? r.state),
    };
}

function parseSummary(raw: unknown, absences: RhTalentAbsence[]): RhTalentAbsencesSummary {
    const r = asRecord(raw);
    const current = num(r.current ?? r.en_cours ?? r.in_progress);
    const upcoming = num(r.upcoming ?? r.a_venir);
    const past = num(r.past ?? r.passees ?? r.passed);
    const total = num(r.total ?? r.count, absences.length);
    if (total > 0 && current === 0 && upcoming === 0 && past === 0) {
        const counts = { current: 0, upcoming: 0, past: 0 };
        for (const a of absences) {
            const st = parseAbsenceStatus(a.status);
            if (st === "current") counts.current += 1;
            else if (st === "upcoming") counts.upcoming += 1;
            else counts.past += 1;
        }
        return { total, ...counts };
    }
    return { total, current, upcoming, past };
}

function normalizeAbsencesResponse(raw: unknown): RhTalentAbsencesResponse {
    const root = unwrapN8nRoot(raw);
    if (root.status === "error" || root.success === false) {
        throw new RhTalentAbsencesApiError(messageFromBody(raw, "Impossible de charger les absences"), {
            httpStatus: 400,
        });
    }
    const absencesRaw = root.absences ?? root.items;
    const absences = Array.isArray(absencesRaw)
        ? absencesRaw.map(parseAbsence).filter((x): x is RhTalentAbsence => x != null)
        : [];
    const summary = parseSummary(root.summary ?? root.stats ?? root, absences);
    return { absences, summary };
}

function parseAbsencesList(raw: unknown): RhTalentAbsence[] {
    const root = unwrapN8nRoot(raw);
    const list = root.absences ?? root.current ?? root.items ?? root.data;
    if (!Array.isArray(list)) return [];
    return list.map(parseAbsence).filter((x): x is RhTalentAbsence => x != null);
}

export function serializeCreateAbsenceBody(payload: CreateRhTalentAbsencePayload): {
    start_date: string;
    end_date: string | null;
    absence_type: RhAbsenceType;
} {
    const start_date = parseFlexibleDateToIso(payload.start_date);
    if (!start_date) {
        throw new RhTalentAbsencesApiError("Date de début invalide — utilisez AAAA-MM-JJ.");
    }
    const endRaw = payload.end_date?.trim();
    const end_date = endRaw ? parseFlexibleDateToIso(endRaw) : null;
    if (endRaw && !end_date) {
        throw new RhTalentAbsencesApiError("Date de fin invalide — utilisez AAAA-MM-JJ.");
    }
    return {
        start_date,
        end_date,
        absence_type: payload.absence_type,
    };
}

export async function getTalentAbsences(
    talentId: string,
    options?: RhTalentAbsencesFetchOptions,
): Promise<RhTalentAbsencesResponse> {
    const url = rhTalentAbsencesGetUrl(talentId);
    console.log("[RH Absences GET]", url);

    const res = await fetch(url, {
        headers: buildRhTalentsAuthHeaders(options?.token),
        credentials: "omit",
        signal: options?.signal,
    });

    let json: unknown = {};
    try {
        json = await res.json();
    } catch {
        json = {};
    }

    if (!res.ok) {
        throw new RhTalentAbsencesApiError(messageFromBody(json, "Impossible de charger les absences"), {
            httpStatus: res.status,
        });
    }

    return normalizeAbsencesResponse(json);
}

/** GET absences en cours (workflow global). */
export async function getCurrentAbsences(options?: RhTalentAbsencesFetchOptions): Promise<RhTalentAbsence[]> {
    const url = rhAbsencesCurrentUrl();
    console.log("[RH Absences CURRENT]", url);

    const res = await fetch(url, {
        headers: buildRhTalentsAuthHeaders(options?.token),
        credentials: "omit",
        signal: options?.signal,
    });

    let json: unknown = {};
    try {
        json = await res.json();
    } catch {
        json = {};
    }

    if (!res.ok) {
        throw new RhTalentAbsencesApiError(messageFromBody(json, "Impossible de charger les absences en cours"), {
            httpStatus: res.status,
        });
    }

    return parseAbsencesList(json);
}

export async function createTalentAbsence(
    talentId: string,
    payload: CreateRhTalentAbsencePayload,
    options?: RhTalentAbsencesFetchOptions,
): Promise<RhTalentAbsence> {
    const url = rhTalentAbsencesPostUrl(talentId);
    const body = serializeCreateAbsenceBody(payload);
    console.log("[RH Absences POST]", url);

    const res = await fetch(url, {
        method: "POST",
        headers: {
            ...buildRhTalentsAuthHeaders(options?.token),
            "Content-Type": "application/json",
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
        throw new RhTalentAbsencesApiError(messageFromBody(json, "Impossible d’ajouter l’absence"), {
            httpStatus: res.status,
        });
    }

    const root = unwrapN8nRoot(json);
    const parsed = parseAbsence(root.absence ?? root.data ?? root);
    if (parsed) return parsed;
    return {
        id: str(root.id) || `new-${Date.now()}`,
        absence_type: body.absence_type,
        start_date: body.start_date,
        end_date: body.end_date,
        duration_days: null,
        status: "upcoming",
    };
}

export async function deleteTalentAbsence(
    absenceId: string,
    options?: RhTalentAbsencesFetchOptions,
): Promise<void> {
    const url = rhTalentAbsencesDeleteUrl(absenceId);
    console.log("[RH Absences DELETE]", url);

    const res = await fetch(url, {
        method: "DELETE",
        headers: buildRhTalentsAuthHeaders(options?.token),
        credentials: "omit",
        signal: options?.signal,
    });

    if (res.ok) return;

    let json: unknown = {};
    try {
        json = await res.json();
    } catch {
        json = {};
    }
    throw new RhTalentAbsencesApiError(messageFromBody(json, "Impossible de supprimer l’absence"), {
        httpStatus: res.status,
    });
}
