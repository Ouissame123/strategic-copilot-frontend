import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, KeyRound, Loader2, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { changeRhStaffPassword } from "@/api/rh-accounts.api";
import { fetchRhProfile, patchRhProfile, rhProfileApiToastMessage } from "@/api/rh-profile.api";
import { RhPageShell } from "@/components/rh/rh-page-shell";
import {
    PROFILE_CARD,
    PROFILE_INPUT,
    PROFILE_LABEL,
    initialsFromName,
    passwordStrengthUi,
} from "@/components/manager/profile/profile-shared";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useAuth } from "@/hooks/useAuth";
import { authStorage } from "@/lib/auth-storage";
import { useToast } from "@/providers/toast-provider";
import type { RhProfile } from "@/types/rh-profile.types";
import {
    RH_ALERT_WARN,
    RH_SKILL_BADGE,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    WS_AVATAR,
    WS_BTN_PRIMARY,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";
import { setApiAuthToken } from "@/utils/apiClient";

const MEMBER_DATE = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

function roleLabel(role: string): string {
    const r = role.trim().toLowerCase();
    if (r === "rh" || r === "hr") return "RH";
    if (r === "manager") return "Manager";
    return role.trim() || "RH";
}

function ProfileLoadingSkeleton() {
    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div className={cx(PROFILE_CARD, "flex animate-pulse gap-5 p-6")}>
                <div className={cx("size-20 shrink-0 rounded-full", WS_AVATAR)} />
                <div className="flex-1 space-y-3 pt-2">
                    <div className="h-6 w-48 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-56 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-5 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
                </div>
            </div>
            <div className={cx(PROFILE_CARD, "h-52 animate-pulse")} />
            <div className={cx(PROFILE_CARD, "h-64 animate-pulse")} />
        </div>
    );
}

/** Route `/workspace/rh/profile` — profil connecté au backend RH. */
export default function RhProfilePage() {
    const { t } = useTranslation("nav");
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { push: pushToast } = useToast();

    const [profile, setProfile] = useState<RhProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [editFullName, setEditFullName] = useState("");
    const [editAvatarUrl, setEditAvatarUrl] = useState("");
    const [savedFullName, setSavedFullName] = useState("");
    const [savedAvatarUrl, setSavedAvatarUrl] = useState("");
    const [profileSaving, setProfileSaving] = useState(false);

    const [pwdNext, setPwdNext] = useState("");
    const [pwdConfirm, setPwdConfirm] = useState("");
    const [pwdSaving, setPwdSaving] = useState(false);

    useCopilotPage("rh_profile", { view: "account" });

    const loadProfile = useCallback(async () => {
        setLoadError(null);
        try {
            const res = await fetchRhProfile();
            setProfile(res.profile);
            setEditFullName(res.profile.full_name);
            setEditAvatarUrl(res.profile.avatar_url ?? "");
            setSavedFullName(res.profile.full_name);
            setSavedAvatarUrl(res.profile.avatar_url ?? "");
        } catch (err) {
            const message = rhProfileApiToastMessage(err, "Impossible de charger le profil.");
            setLoadError(message);
            pushToast(message, "error");
        } finally {
            setLoading(false);
        }
    }, [pushToast]);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    const profileDirty =
        editFullName.trim() !== savedFullName.trim() ||
        editAvatarUrl.trim() !== savedAvatarUrl.trim();

    const profileValid = editFullName.trim().length > 0;
    const canSaveProfile = profileDirty && profileValid && !profileSaving;

    const pwdStrength = useMemo(() => passwordStrengthUi(pwdNext), [pwdNext]);
    const pwdValid = pwdNext.length >= 8 && pwdNext === pwdConfirm;
    const pwdDirty = Boolean(pwdNext || pwdConfirm);
    const canSubmitPassword = pwdDirty && pwdValid && !pwdSaving;

    const handleProfileSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!canSaveProfile || !profile) return;

        const body: { full_name?: string; avatar_url?: string } = {};
        const nextName = editFullName.trim();
        const nextAvatar = editAvatarUrl.trim();

        if (nextName !== savedFullName.trim()) body.full_name = nextName;
        if (nextAvatar !== savedAvatarUrl.trim()) {
            body.avatar_url = nextAvatar || "";
        }

        setProfileSaving(true);
        try {
            await patchRhProfile(body);
            pushToast("Profil mis à jour.", "success");
            setLoading(true);
            await loadProfile();
        } catch (err) {
            pushToast(rhProfileApiToastMessage(err, "Erreur lors de la sauvegarde."), "error");
        } finally {
            setProfileSaving(false);
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmitPassword || !profile) return;

        setPwdSaving(true);
        try {
            await changeRhStaffPassword(profile.id, pwdNext);
            pushToast("Mot de passe mis à jour.", "success");
            setPwdNext("");
            setPwdConfirm("");
            authStorage.clear();
            setApiAuthToken(null);
            await logout();
            navigate("/login", { replace: true });
        } catch (err) {
            pushToast(rhProfileApiToastMessage(err, "Erreur lors du changement de mot de passe."), "error");
        } finally {
            setPwdSaving(false);
        }
    };

    const title = t("profile");
    const displayName = profile?.full_name.trim() || "—";
    const displayEmail = profile?.email.trim() || "—";
    const initials = initialsFromName(displayName, displayEmail);
    const avatarSrc = profile?.avatar_url?.trim() || undefined;
    const memberSince =
        profile?.created_at && !Number.isNaN(Date.parse(profile.created_at))
            ? MEMBER_DATE.format(new Date(profile.created_at))
            : "—";

    return (
        <RhPageShell title={title} description={undefined}>
            {profile?.must_change_password ? (
                <div className={cx("mb-6 flex gap-3 px-4 py-3", RH_ALERT_WARN)} role="alert">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                    <p className="text-sm font-medium">Vous devez changer votre mot de passe</p>
                </div>
            ) : null}

            {loading && !profile ? (
                <ProfileLoadingSkeleton />
            ) : loadError && !profile ? (
                <div className="mx-auto max-w-2xl">
                    <div className={cx(PROFILE_CARD, "p-6 text-center")}>
                        <p className={cx("text-sm", RH_TEXT_PRIMARY)}>{loadError}</p>
                        <button
                            type="button"
                            onClick={() => {
                                setLoading(true);
                                void loadProfile();
                            }}
                            className={cx("mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white", WS_BTN_PRIMARY)}
                        >
                            Réessayer
                        </button>
                    </div>
                </div>
            ) : profile ? (
                <div className="mx-auto max-w-2xl space-y-6">
                    <section className={cx(PROFILE_CARD, "flex flex-col gap-5 p-6 sm:flex-row sm:items-center")}>
                        <div
                            className={cx(
                                "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold ring-4 ring-white shadow-md dark:ring-slate-800",
                                WS_AVATAR,
                            )}
                        >
                            {avatarSrc ? (
                                <img src={avatarSrc} alt="" className="size-full object-cover" />
                            ) : (
                                initials
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className={cx("text-xl font-bold tracking-tight", RH_TEXT_PRIMARY)}>{displayName}</h2>
                            <p className={cx("mt-1 text-sm", RH_TEXT_MUTED)}>{displayEmail}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase", RH_SKILL_BADGE)}>
                                    Rôle : {roleLabel(profile.role)}
                                </span>
                                <span className={cx("text-sm", RH_TEXT_MUTED)}>Membre depuis : {memberSince}</span>
                            </div>
                        </div>
                    </section>

                    <section className={cx(PROFILE_CARD, "p-5 sm:p-6")}>
                        <header className="mb-5 flex items-start gap-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                                <UserCircle className="size-5" aria-hidden />
                            </span>
                            <div>
                                <h3 className={cx("text-base font-semibold", RH_TEXT_PRIMARY)}>Modifier le profil</h3>
                                <p className={cx("text-sm", RH_TEXT_MUTED)}>Nom et photo de profil (URL).</p>
                            </div>
                        </header>

                        <form className="space-y-4" onSubmit={handleProfileSave}>
                            <label className="grid gap-1.5">
                                <span className={PROFILE_LABEL}>Nom complet</span>
                                <input
                                    type="text"
                                    value={editFullName}
                                    onChange={(e) => setEditFullName(e.target.value)}
                                    required
                                    className={PROFILE_INPUT}
                                />
                            </label>

                            <label className="grid gap-1.5">
                                <span className={PROFILE_LABEL}>URL avatar (optionnel)</span>
                                <input
                                    type="url"
                                    value={editAvatarUrl}
                                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                                    placeholder="https://…"
                                    className={PROFILE_INPUT}
                                />
                            </label>

                            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                                <button
                                    type="submit"
                                    disabled={!canSaveProfile}
                                    className={cx(
                                        "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50",
                                        WS_BTN_PRIMARY,
                                    )}
                                >
                                    {profileSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                                    {profileSaving ? "Enregistrement…" : "Enregistrer"}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className={cx(PROFILE_CARD, "p-5 sm:p-6")}>
                        <header className="mb-5 flex items-start gap-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                                <KeyRound className="size-5" aria-hidden />
                            </span>
                            <div>
                                <h3 className={cx("text-base font-semibold", RH_TEXT_PRIMARY)}>Changer le mot de passe</h3>
                                <p className={cx("text-sm", RH_TEXT_MUTED)}>Minimum 8 caractères. Reconnexion requise après mise à jour.</p>
                            </div>
                        </header>

                        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                            <label className="grid gap-1.5">
                                <span className={PROFILE_LABEL}>Nouveau mot de passe</span>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    value={pwdNext}
                                    onChange={(e) => setPwdNext(e.target.value)}
                                    minLength={8}
                                    className={PROFILE_INPUT}
                                />
                                {pwdNext ? (
                                    <div className="mt-1">
                                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div
                                                className={cx("h-full rounded-full transition-all", pwdStrength.barClass)}
                                                style={{ width: `${pwdStrength.score}%` }}
                                            />
                                        </div>
                                        <p className={cx("mt-1 text-xs", RH_TEXT_MUTED)}>
                                            Robustesse :{" "}
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{pwdStrength.label}</span>
                                        </p>
                                    </div>
                                ) : null}
                            </label>

                            <label className="grid gap-1.5">
                                <span className={PROFILE_LABEL}>Confirmation</span>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    value={pwdConfirm}
                                    onChange={(e) => setPwdConfirm(e.target.value)}
                                    className={PROFILE_INPUT}
                                />
                                {pwdConfirm && pwdNext !== pwdConfirm ? (
                                    <span className="text-xs text-rose-600 dark:text-rose-400">Les mots de passe ne correspondent pas.</span>
                                ) : null}
                            </label>

                            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                                <button
                                    type="submit"
                                    disabled={!canSubmitPassword}
                                    className={cx(
                                        "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50",
                                        WS_BTN_PRIMARY,
                                    )}
                                >
                                    {pwdSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                                    {pwdSaving ? "Mise à jour…" : "Mettre à jour"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            ) : null}
        </RhPageShell>
    );
}
