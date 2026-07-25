import { useEffect, useState, type FormEvent } from "react";
import { Loader2, UserCircle } from "lucide-react";
import { profileInitials } from "../utils/profileInitials";
import {
    RH_PROFILE_AVATAR_GRADIENT,
    RH_PROFILE_BTN_DISABLED,
    RH_PROFILE_CARD,
    RH_PROFILE_ICON_BOX,
    RH_PROFILE_INPUT,
    RH_PROFILE_LABEL,
} from "../profile-ui";
import { WS_BTN_PRIMARY } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type ProfileEditFormProps = {
    fullName: string;
    avatarUrl: string;
    emailForInitials: string;
    onFullNameChange: (value: string) => void;
    onAvatarUrlChange: (value: string) => void;
    onSubmit: (e: FormEvent) => void;
    canSave: boolean;
    saving: boolean;
};

function AvatarPreview({ url, initials }: { url: string; initials: string }) {
    const [broken, setBroken] = useState(false);
    const trimmed = url.trim();
    const showImage = Boolean(trimmed) && !broken;

    useEffect(() => {
        setBroken(false);
    }, [trimmed]);

    return (
        <div
            className={cx(
                "flex size-7 shrink-0 items-center justify-center self-center overflow-hidden rounded-full text-[10px] font-bold",
                showImage ? "bg-slate-100 dark:bg-slate-800" : RH_PROFILE_AVATAR_GRADIENT,
            )}
            aria-hidden
        >
            {showImage ? (
                <img
                    src={trimmed}
                    alt=""
                    className="size-full object-cover"
                    onError={() => setBroken(true)}
                />
            ) : (
                initials
            )}
        </div>
    );
}

export function ProfileEditForm({
    fullName,
    avatarUrl,
    emailForInitials,
    onFullNameChange,
    onAvatarUrlChange,
    onSubmit,
    canSave,
    saving,
}: ProfileEditFormProps) {
    const initials = profileInitials(fullName, emailForInitials);

    return (
        <section className={cx(RH_PROFILE_CARD, "p-6")}>
            <header className="mb-5 flex items-start gap-3">
                <span className={RH_PROFILE_ICON_BOX}>
                    <UserCircle className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Modifier le profil</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Nom et photo de profil (URL).</p>
                </div>
            </header>

            <form className="space-y-4" onSubmit={onSubmit}>
                <label className="grid gap-1.5">
                    <span className={RH_PROFILE_LABEL}>Nom complet</span>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => onFullNameChange(e.target.value)}
                        required
                        autoComplete="name"
                        className={RH_PROFILE_INPUT}
                    />
                </label>

                <div className="grid gap-1.5">
                    <span className={RH_PROFILE_LABEL} id="rh-profile-avatar-label">
                        URL avatar (optionnel)
                    </span>
                    <div className="flex items-center gap-2.5">
                        <AvatarPreview url={avatarUrl} initials={initials} />
                        <input
                            type="url"
                            value={avatarUrl}
                            onChange={(e) => onAvatarUrlChange(e.target.value)}
                            placeholder="https://…"
                            aria-labelledby="rh-profile-avatar-label"
                            className={RH_PROFILE_INPUT}
                        />
                    </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                    <button
                        type="submit"
                        disabled={!canSave}
                        className={cx(
                            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white",
                            RH_PROFILE_BTN_DISABLED,
                            canSave ? WS_BTN_PRIMARY : "bg-primary-600/80 dark:bg-primary-600/70",
                        )}
                    >
                        {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                        {saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </div>
            </form>
        </section>
    );
}
