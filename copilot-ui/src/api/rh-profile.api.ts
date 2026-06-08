/**
 * Profil RH — GET/PATCH `/webhook/rh/profile`.
 */
import { ApiError } from "@/api/errors";
import { httpGet, httpPatch, type HttpRequestOptions } from "@/api/api";
import { getN8nBaseUrl } from "@/lib/build-n8n-url";
import type { RhProfile, RhProfileGetResponse, RhProfilePatchBody, RhProfilePatchResponse } from "@/types/rh-profile.types";
import { asRecord, unwrapN8nRoot } from "@/utils/unwrap-api-payload";

/** GET/PATCH profil — `…/webhook/rh/profile` */
const RH_PROFILE_PATH = "/rh/profile";

function trimHostBase(base: string): string {
    return base.replace(/\/+$/, "");
}

function rhProfileWebhookUrl(path: string): string {
    const segment = path.startsWith("/") ? path : `/${path}`;
    const webhookPath = segment.startsWith("/webhook/") ? segment : `/webhook${segment}`;
    const host = trimHostBase(getN8nBaseUrl());
    return host ? `${host}${webhookPath}` : webhookPath;
}

function str(v: unknown): string {
    return v != null ? String(v).trim() : "";
}

function parseRhProfile(raw: unknown): RhProfile | null {
    const r = asRecord(raw);
    const id = str(r.id);
    const full_name = str(r.full_name);
    const email = str(r.email);
    if (!id || !full_name || !email) return null;

    const avatarRaw = r.avatar_url;
    const avatar_url =
        avatarRaw == null || avatarRaw === "" ? null : str(avatarRaw) || null;

    return {
        id,
        full_name,
        email,
        role: str(r.role) || "rh",
        status: str(r.status) || "active",
        avatar_url,
        must_change_password: r.must_change_password === true,
        created_at: str(r.created_at),
        updated_at: str(r.updated_at),
    };
}

function messageFromPayload(payload: unknown, fallback: string): string {
    if (typeof payload === "string") {
        const t = payload.trim();
        return t && t.length <= 400 ? t : fallback;
    }
    if (!payload || typeof payload !== "object") return fallback;
    const o = payload as Record<string, unknown>;
    const data = o.data && typeof o.data === "object" ? (o.data as Record<string, unknown>) : null;
    const msg = str(data?.message ?? o.message ?? o.error ?? o.detail ?? data?.error);
    return msg || fallback;
}

export function mapRhProfileApiError(err: unknown, context: "get" | "patch"): string {
    if (err instanceof ApiError) {
        if (err.status === 401) return "Session expirée. Reconnectez-vous.";
        if (err.status === 404) return "Profil introuvable.";
        if (err.payload) return messageFromPayload(err.payload, err.message);
        return err.message;
    }
    return err instanceof Error
        ? err.message
        : context === "get"
          ? "Impossible de charger le profil."
          : "Erreur lors de la mise à jour du profil.";
}

/** Message API pour toast — privilégie `data.message`. */
export function rhProfileApiToastMessage(err: unknown, fallback: string): string {
    if (err instanceof ApiError && err.payload) {
        return messageFromPayload(err.payload, err.message || fallback);
    }
    if (err instanceof ApiError) return err.message || fallback;
    return err instanceof Error ? err.message : fallback;
}

export async function fetchRhProfile(opts?: HttpRequestOptions): Promise<RhProfileGetResponse> {
    try {
        const raw = await httpGet<unknown>(rhProfileWebhookUrl(RH_PROFILE_PATH), opts);
        const root = unwrapN8nRoot(raw);
        const profile = parseRhProfile(root.profile ?? root);
        if (!profile) {
            throw new ApiError("Réponse profil invalide.", 500, raw);
        }
        return { profile };
    } catch (err) {
        if (err instanceof ApiError) {
            throw new ApiError(mapRhProfileApiError(err, "get"), err.status, err.payload);
        }
        throw new ApiError(mapRhProfileApiError(err, "get"));
    }
}

export async function patchRhProfile(
    body: RhProfilePatchBody,
    opts?: HttpRequestOptions,
): Promise<RhProfilePatchResponse> {
    const payload: RhProfilePatchBody = {};
    if (body.full_name !== undefined) payload.full_name = body.full_name;
    if (body.avatar_url !== undefined) payload.avatar_url = body.avatar_url;

    if (!Object.keys(payload).length) {
        throw new ApiError("Aucune modification à enregistrer.");
    }

    try {
        const raw = await httpPatch<unknown>(rhProfileWebhookUrl(RH_PROFILE_PATH), payload, opts);
        const root = unwrapN8nRoot(raw);
        const profile = parseRhProfile(root.profile ?? root);
        return {
            status: str(root.status) || "success",
            profile: profile ?? undefined,
            message: str(root.message) || undefined,
        };
    } catch (err) {
        if (err instanceof ApiError) {
            throw new ApiError(mapRhProfileApiError(err, "patch"), err.status, err.payload);
        }
        throw new ApiError(mapRhProfileApiError(err, "patch"));
    }
}

export const rhProfileService = {
    fetchRhProfile,
    patchRhProfile,
    mapRhProfileApiError,
    rhProfileApiToastMessage,
};
