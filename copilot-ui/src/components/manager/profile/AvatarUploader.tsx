import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadAvatarToStorage } from "@/lib/supabase-avatar-upload";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/providers/toast-provider";
import { cx } from "@/utils/cx";
import { initialsFromName } from "./profile-shared";

type AvatarUploaderProps = {
    userId?: string;
    name: string;
    email: string;
    src?: string;
    /** URL publique Supabase après upload (`…/object/public/avatars/…`). */
    onChange?: (publicUrl: string) => void | Promise<void>;
    sizeClass?: string;
};

export function AvatarUploader({ userId, name, email, src, onChange, sizeClass = "size-24" }: AvatarUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const { push: pushToast } = useToast();

    useEffect(() => {
        return () => {
            if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
        };
    }, [localPreview]);

    const displaySrc = localPreview ?? (src?.trim() || undefined);
    const initials = initialsFromName(name, email);

    const handleChange = async (file: File | undefined) => {
        if (!file || !file.type.startsWith("image/")) return;

        if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
        setLocalPreview(URL.createObjectURL(file));

        if (!supabase || !userId) return;

        setUploading(true);
        try {
            const publicUrl = await uploadAvatarToStorage(userId, file);
            await onChange?.(publicUrl);
            pushToast("Photo de profil mise à jour.", "success");
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : typeof err === "object" && err !== null && "message" in err
                      ? String((err as { message: unknown }).message)
                      : "Échec de la mise à jour de la photo.";
            pushToast(message, "error");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative inline-block">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                    void handleChange(e.target.files?.[0]);
                    e.target.value = "";
                }}
            />
            <div
                className={cx(
                    "relative overflow-hidden rounded-full ring-4 ring-white shadow-lg dark:ring-slate-800",
                    sizeClass,
                )}
            >
                {displaySrc ? (
                    <img src={displaySrc} alt="" className="size-full object-cover" />
                ) : (
                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white">
                        {initials}
                    </div>
                )}
                {uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                        <Loader2 className="size-8 animate-spin text-white" aria-hidden />
                    </div>
                ) : null}
            </div>
            <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                aria-label="Modifier la photo de profil"
            >
                <Camera className="size-4" aria-hidden />
            </button>
        </div>
    );
}
