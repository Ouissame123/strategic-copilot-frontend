/**
 * Upload avatar vers Supabase Storage (bucket `avatars`, fichier `{userId}.png`, upsert).
 * Variables d’environnement : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
 */

const BUCKET = "avatars";

function getSupabaseEnv(): { baseUrl: string; anonKey: string } | null {
    const baseUrl = String((import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
    const anonKey = String((import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_ANON_KEY ?? "").trim();
    if (!baseUrl || !anonKey) return null;
    return { baseUrl, anonKey };
}

/** Indique si l’upload d’avatar vers Supabase Storage peut fonctionner (variables Vite présentes). */
export function isSupabaseAvatarUploadConfigured(): boolean {
    return getSupabaseEnv() != null;
}

function readSupabaseEnv(): { baseUrl: string; anonKey: string } {
    const v = getSupabaseEnv();
    if (!v) {
        throw new Error("Configuration Supabase manquante (VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY).");
    }
    return v;
}

/** Redimensionne puis exporte en PNG (navigateur). */
export async function imageFileToPngBlob(file: File, maxEdge = 1200): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    try {
        const w = bitmap.width;
        const h = bitmap.height;
        const scale = Math.min(1, maxEdge / Math.max(w, h));
        const tw = Math.max(1, Math.round(w * scale));
        const th = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D indisponible.");
        ctx.drawImage(bitmap, 0, 0, tw, th);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.92));
        if (!blob) throw new Error("Export PNG impossible.");
        return blob;
    } finally {
        bitmap.close();
    }
}

/** URL publique du fichier (sans query string). */
export function publicAvatarObjectUrl(userId: string, baseUrl: string): string {
    const path = `${userId}.png`;
    return `${baseUrl}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(path)}`;
}

/**
 * Envoie le PNG dans le bucket `avatars` avec le nom `{userId}.png` et `x-upsert: true`.
 * Retourne l’URL publique de base (sans cache buster).
 */
export async function uploadUserAvatarPng(userId: string, pngBlob: Blob): Promise<string> {
    const { baseUrl, anonKey } = readSupabaseEnv();
    const path = `${userId}.png`;
    const uploadUrl = `${baseUrl}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`;

    const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
            "Content-Type": "image/png",
            "x-upsert": "true",
        },
        body: pngBlob,
    });

    if (!res.ok) {
        let detail = "";
        try {
            detail = await res.text();
        } catch {
            /* ignore */
        }
        throw new Error(detail || `Échec upload (${res.status})`);
    }

    return publicAvatarObjectUrl(userId, baseUrl);
}
