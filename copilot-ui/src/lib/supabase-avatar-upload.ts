import { supabase } from "@/lib/supabaseClient";

const BUCKET = "avatars";

/** Indique si l’upload d’avatar vers Supabase Storage peut fonctionner. */
export function isSupabaseAvatarUploadConfigured(): boolean {
    return supabase != null;
}

function toSafeFileName(fileName: string): string {
    const safeFileName = fileName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .toLowerCase()
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

    if (!safeFileName || safeFileName === ".") return "avatar.png";
    return safeFileName.slice(0, 180);
}

/** `supabase.storage.from("avatars").getPublicUrl(filePath)` — jamais d’URL construite à la main. */
export function getAvatarPublicUrl(filePath: string): string {
    if (!supabase) {
        throw new Error("Supabase non configuré.");
    }
    const normalized = filePath.replace(/^\/+/, "");
    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(normalized);
    return publicData.publicUrl;
}

/**
 * Upload dans le bucket public `avatars` : `{userId}/{timestamp}-{safeFileName}`.
 * Retourne l’URL publique (`…/storage/v1/object/public/avatars/…`).
 */
export async function uploadAvatarToStorage(userId: string, file: File): Promise<string> {
    if (!supabase) {
        throw new Error("Supabase non configuré.");
    }

    const safeFileName = toSafeFileName(file.name);
    const filePath = `${userId}/${Date.now()}-${safeFileName}`;

    console.log("Uploading avatar to:", filePath, file.type, file.size);

    const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/png",
    });

    if (error) {
        console.error("Supabase avatar upload error:", error);
        throw error;
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return publicData.publicUrl;
}
