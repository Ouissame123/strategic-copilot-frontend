import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { AlertTriangle, Clock, Copy01, Key01, ShieldTick, User01, Pencil01 } from "@untitledui/icons";
import { PageHero } from "@/components/layout/PageHero";
import { Avatar } from "@/components/base/avatar/avatar";
import { useChangePassword, useMe, useUpdateProfile, useUploadAvatar } from "@/hooks/useMe";
import { authStorage } from "@/lib/auth-storage";
import { isSupabaseAvatarUploadConfigured } from "@/lib/supabase-avatar-upload";
import { useToast } from "@/providers/toast-provider";
import { cx } from "@/utils/cx";

export type ProfilePageProps = { variant?: "default" | "manager" };

const MANAGER_NOTIF_PREFS_KEY = "manager-profile-notif-prefs-v1";

type ManagerNotifPrefs = { digest: boolean; criticalOnly: boolean };

type InlineMsg = { type: "ok" | "err"; text: string } | null;

function initialsFromUser(fullName: string | undefined, email: string | undefined): string {
    const n = (fullName ?? "").trim();
    if (n) {
        const parts = n.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
        return n.slice(0, 2).toUpperCase();
    }
    return (email?.charAt(0) ?? "?").toUpperCase();
}

function roleLabel(role: string): string {
    const r = role.toLowerCase();
    if (r === "manager") return "Manager";
    if (r === "rh" || r === "hr") return "RH";
    if (r === "admin") return "Admin";
    return role;
}

/** Masque un UUID : `USER-a1b2…c3d4` (jamais la chaîne complète à l’écran). */
function maskedCode(id: string | undefined, prefix: "USER" | "ENT"): string {
    const raw = (id ?? "").replace(/-/g, "").trim();
    if (raw.length < 8) return `${prefix}-****`;
    return `${prefix}-${raw.slice(0, 4).toLowerCase()}…${raw.slice(-4).toLowerCase()}`;
}

function passwordStrengthUi(password: string): { score: number; label: string; barClass: string } {
    if (!password) return { score: 0, label: "—", barClass: "bg-secondary_subtle" };
    let score = 0;
    if (password.length >= 8) score += 22;
    if (password.length >= 12) score += 12;
    if (/[a-z]/.test(password)) score += 14;
    if (/[A-Z]/.test(password)) score += 14;
    if (/\d/.test(password)) score += 14;
    if (/[^A-Za-z0-9]/.test(password)) score += 14;
    score = Math.min(100, score);
    if (score < 40) return { score, label: "Faible", barClass: "bg-red-400" };
    if (score < 70) return { score, label: "Correct", barClass: "bg-amber-400" };
    return { score, label: "Robuste", barClass: "bg-emerald-500" };
}

function computeSecurityScore(user: {
    status: string;
    email: string;
    role: string;
    enterprise_name: string;
    password_expires_at: string | null;
}): { total: number; label: "Excellent" | "Moyen" | "À sécuriser" } {
    let total = 0;
    if (user.status === "active") total += 30;
    const exp = user.password_expires_at ? new Date(user.password_expires_at).getTime() : null;
    if (exp == null || exp > Date.now()) total += 30;
    if (user.email?.trim()) total += 20;
    if (user.role?.trim() && user.enterprise_name?.trim()) total += 20;
    const label = total >= 80 ? "Excellent" : total >= 50 ? "Moyen" : "À sécuriser";
    return { total, label };
}

function statusLabel(status: string): string {
    const s = status.toLowerCase();
    if (s === "active") return "Actif";
    if (s === "pending") return "En attente";
    if (s === "suspended") return "Suspendu";
    return status;
}

export default function ProfilePage({ variant = "default" }: ProfilePageProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const embeddedInTalent = location.pathname === "/workspace/talent/profile";

    const { data, isLoading, isError } = useMe();
    const updateProfile = useUpdateProfile();
    const changePassword = useChangePassword();
    const uploadAvatar = useUploadAvatar();
    const { push: pushToast } = useToast();
    const avatarFileInputRef = useRef<HTMLInputElement>(null);

    const [profile, setProfile] = useState({ full_name: "", email: "" });
    const [profileMsg, setProfileMsg] = useState<InlineMsg>(null);

    const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
    const [pwdMsg, setPwdMsg] = useState<InlineMsg>(null);

    const [managerNotifPrefs, setManagerNotifPrefs] = useState<ManagerNotifPrefs>({ digest: true, criticalOnly: false });

    useEffect(() => {
        if (variant !== "manager") return;
        try {
            const raw = localStorage.getItem(MANAGER_NOTIF_PREFS_KEY);
            if (!raw) return;
            const p = JSON.parse(raw) as Partial<ManagerNotifPrefs>;
            setManagerNotifPrefs({ digest: Boolean(p.digest ?? true), criticalOnly: Boolean(p.criticalOnly) });
        } catch {
            /* ignore */
        }
    }, [variant]);

    useEffect(() => {
        if (!data?.user) return;
        setProfile({
            full_name: data.user.full_name ?? "",
            email: data.user.email ?? "",
        });
    }, [data]);

    const user = data?.user;
    const talent = data?.talent;

    const passwordExpiresInDays = useMemo(() => {
        if (!user?.password_expires_at) return null;
        return Math.floor((new Date(user.password_expires_at).getTime() - Date.now()) / 86400000);
    }, [user?.password_expires_at]);

    const profileUnchanged = !user || (profile.full_name === user.full_name && profile.email === user.email);

    const pwdStrength = useMemo(() => passwordStrengthUi(pwd.next), [pwd.next]);

    const handleAvatarFileChange = useCallback(
        async (e: ChangeEvent<HTMLInputElement>) => {
            const input = e.currentTarget;
            const file = input.files?.[0];
            input.value = "";
            const uid = data?.user?.id;
            if (!file || !uid) return;
            if (!isSupabaseAvatarUploadConfigured()) {
                pushToast(
                    "Changement de photo indisponible : ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans ton fichier .env (voir .env.production, lignes commentées).",
                    "neutral",
                );
                return;
            }
            if (!file.type.startsWith("image/")) {
                pushToast("Choisis un fichier image.", "error");
                return;
            }
            try {
                await uploadAvatar.mutateAsync({ userId: uid, file });
                pushToast("Photo de profil mise à jour.", "success");
            } catch (err: unknown) {
                const ax = err as { response?: { data?: { message?: string } }; message?: string };
                const message =
                    ax?.response?.data?.message ??
                    (typeof ax?.message === "string" ? ax.message : null) ??
                    (err instanceof Error ? err.message : null) ??
                    "Échec de la mise à jour de la photo.";
                pushToast(message, "error");
            }
        },
        [data?.user?.id, pushToast, uploadAvatar],
    );

    const securityScore = useMemo(() => (user ? computeSecurityScore(user) : { total: 0, label: "À sécuriser" as const }), [user]);

    const accountCodeDisplay = useMemo(() => maskedCode(user?.id, "USER"), [user?.id]);
    const enterpriseCodeDisplay = useMemo(() => maskedCode(user?.enterprise_id, "ENT"), [user?.enterprise_id]);

    const handleProfileSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setProfileMsg(null);
        try {
            await updateProfile.mutateAsync({
                full_name: profile.full_name.trim(),
                email: profile.email.trim(),
            });
            setProfileMsg({ type: "ok", text: "Profil mis à jour." });
        } catch (err: unknown) {
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Erreur lors de la sauvegarde.";
            setProfileMsg({ type: "err", text: message });
        }
    };

    const handlePasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setPwdMsg(null);

        if (pwd.next !== pwd.confirm) {
            setPwdMsg({ type: "err", text: "Les 2 nouveaux mots de passe ne correspondent pas." });
            return;
        }
        if (pwd.next.length < 8) {
            setPwdMsg({ type: "err", text: "Mot de passe : 8 caractères minimum." });
            return;
        }
        if (pwd.next === pwd.current) {
            setPwdMsg({ type: "err", text: "Le nouveau mot de passe doit être différent de l'actuel." });
            return;
        }

        try {
            const res = await changePassword.mutateAsync({
                current_password: pwd.current,
                new_password: pwd.next,
            });
            setPwd({ current: "", next: "", confirm: "" });
            setPwdMsg({ type: "ok", text: "Mot de passe changé. Redirection vers login…" });
            if (res.security?.requires_relogin) {
                authStorage.clear();
                setTimeout(() => navigate("/login"), 1500);
            }
        } catch (err: unknown) {
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Mot de passe actuel incorrect.";
            setPwdMsg({ type: "err", text: message });
        }
    };

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            window.prompt(`Copier ${label}`, text);
        }
    };

    if (isLoading) {
        return (
            <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
                <div className="h-32 animate-pulse rounded-2xl bg-secondary_subtle" />
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="h-64 animate-pulse rounded-2xl bg-secondary_subtle" />
                    <div className="h-64 animate-pulse rounded-2xl bg-secondary_subtle" />
                </div>
            </div>
        );
    }
    if (isError) {
        return (
            <div className="mx-auto max-w-lg rounded-2xl border border-secondary bg-primary px-6 py-10 text-center">
                <p className="text-sm font-medium text-primary">Profil indisponible</p>
                <p className="mt-2 text-xs text-tertiary">Une erreur est survenue en chargeant le compte. Réessayez plus tard.</p>
            </div>
        );
    }
    if (data === null) {
        return (
            <div className="mx-auto max-w-lg rounded-2xl border border-secondary bg-primary px-6 py-10 text-center">
                <p className="text-sm font-medium text-primary">Session non valide</p>
                <p className="mt-2 text-xs text-tertiary">Reconnectez-vous pour accéder au profil.</p>
                <button
                    type="button"
                    className="mt-4 rounded-lg bg-brand-solid px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => navigate("/login")}
                >
                    Connexion
                </button>
            </div>
        );
    }
    if (!user) {
        return (
            <div className="mx-auto max-w-lg rounded-2xl border border-secondary bg-primary px-6 py-10 text-center">
                <p className="text-sm font-medium text-primary">Profil introuvable</p>
                <p className="mt-2 text-xs text-tertiary">Impossible de charger les informations du compte.</p>
            </div>
        );
    }

    const initials = initialsFromUser(user.full_name, user.email);
    const isActive = user.status === "active";
    const canUploadAvatar = isSupabaseAvatarUploadConfigured();

    if (variant === "manager" && !embeddedInTalent) {
        const persistManagerNotif = (next: ManagerNotifPrefs) => {
            setManagerNotifPrefs(next);
            try {
                localStorage.setItem(MANAGER_NOTIF_PREFS_KEY, JSON.stringify(next));
            } catch {
                /* ignore */
            }
        };

        return (
            <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 lg:py-8">
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
                    <div className="relative shrink-0">
                        <input
                            ref={avatarFileInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            aria-hidden
                            tabIndex={-1}
                            onChange={handleAvatarFileChange}
                        />
                        <div className="relative">
                            <Avatar
                                key={user.avatar_url ?? "no-avatar"}
                                size="2xl"
                                src={user.avatar_url?.trim() || undefined}
                                initials={initials}
                                alt={user.full_name || user.email}
                                contrastBorder
                            />
                            {uploadAvatar.isPending ? (
                                <div
                                    className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-primary/75 ring-2 ring-inset ring-secondary/40"
                                    aria-live="polite"
                                >
                                    <span
                                        className="size-8 animate-spin rounded-full border-2 border-brand-secondary border-t-transparent"
                                        aria-label="Téléversement en cours"
                                    />
                                </div>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            className="absolute -bottom-0.5 -right-0.5 flex size-9 items-center justify-center rounded-full border border-secondary bg-primary text-secondary shadow-md ring-2 ring-primary transition hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={uploadAvatar.isPending || !canUploadAvatar}
                            onClick={() => avatarFileInputRef.current?.click()}
                            aria-label={canUploadAvatar ? "Modifier la photo de profil" : "Changement de photo indisponible (configuration Supabase)"}
                            title={
                                canUploadAvatar
                                    ? undefined
                                    : "Définis VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env pour activer l’upload."
                            }
                        >
                            <Pencil01 className="size-4 shrink-0" aria-hidden />
                        </button>
                    </div>
                    <p className="max-w-md text-center text-xs text-tertiary sm:text-start">
                        {canUploadAvatar ? (
                            <>
                                Photo affichée sur cette page et dans le menu compte (en haut). Formats image acceptés ; envoi vers le stockage puis
                                enregistrement sur ton compte.
                            </>
                        ) : (
                            <>
                                Photo affichée sur cette page et dans le menu compte. Pour modifier l’image, configure{" "}
                                <span className="font-mono text-[10px] text-secondary">VITE_SUPABASE_URL</span> et{" "}
                                <span className="font-mono text-[10px] text-secondary">VITE_SUPABASE_ANON_KEY</span> (bucket public{" "}
                                <span className="font-mono text-[10px]">avatars</span>) puis redémarre le serveur de dev.
                            </>
                        )}
                    </p>
                </div>

                {user.must_change_password ? (
                    <div
                        className="flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/25"
                        role="status"
                    >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100">
                            <AlertTriangle className="size-4" aria-hidden />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">Action requise</p>
                            <p className="mt-0.5 text-sm text-amber-900/95 dark:text-amber-100/90">
                                Définis un nouveau mot de passe pour sécuriser ton compte.
                            </p>
                        </div>
                    </div>
                ) : null}

                {passwordExpiresInDays != null && passwordExpiresInDays < 30 && passwordExpiresInDays >= 0 ? (
                    <div className="flex items-start gap-2 rounded-xl border border-secondary bg-primary_alt/40 px-3 py-2.5 text-sm text-secondary">
                        <Key01 className="mt-0.5 size-4 shrink-0 text-tertiary" aria-hidden />
                        <p>
                            Mot de passe : expire dans <strong className="text-primary">{passwordExpiresInDays}</strong> jour(s).
                        </p>
                    </div>
                ) : null}

                <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm ring-1 ring-secondary/25 lg:p-5">
                    <div className="mb-4 flex items-start gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-secondary_subtle text-secondary">
                            <User01 className="size-4" aria-hidden />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-primary">Informations utilisateur</h2>
                            <p className="text-xs text-tertiary">Nom et e-mail de connexion.</p>
                        </div>
                    </div>
                    <form onSubmit={handleProfileSubmit} className="space-y-3">
                        <label className="grid gap-1 text-sm">
                            <span className="text-xs font-medium text-secondary">Nom complet</span>
                            <input
                                type="text"
                                value={profile.full_name}
                                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                                required
                                className="w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm outline-none transition focus:border-brand-secondary/40 focus:ring-2 focus:ring-brand-secondary/15"
                            />
                        </label>
                        <label className="grid gap-1 text-sm">
                            <span className="text-xs font-medium text-secondary">E-mail</span>
                            <input
                                type="email"
                                value={profile.email}
                                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                                required
                                className="w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm outline-none transition focus:border-brand-secondary/40 focus:ring-2 focus:ring-brand-secondary/15"
                            />
                        </label>
                        {profileMsg ? (
                            <div
                                className={cx(
                                    "rounded-lg border px-3 py-2 text-sm",
                                    profileMsg.type === "ok"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
                                        : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100",
                                )}
                            >
                                {profileMsg.text}
                            </div>
                        ) : null}
                        <button
                            type="submit"
                            disabled={updateProfile.isPending || profileUnchanged}
                            className="rounded-xl bg-brand-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {updateProfile.isPending ? "Enregistrement…" : "Enregistrer"}
                        </button>
                    </form>
                </section>

                <section id="security-password" className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm ring-1 ring-secondary/25 lg:p-5">
                    <div className="mb-4 flex items-start gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-secondary_subtle text-secondary">
                            <ShieldTick className="size-4" aria-hidden />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-primary">Mot de passe</h2>
                            <p className="text-xs text-tertiary">Après changement, une reconnexion peut être demandée.</p>
                        </div>
                    </div>
                    <form onSubmit={handlePasswordSubmit} className="space-y-3">
                        <label className="grid gap-1 text-sm">
                            <span className="text-xs font-medium text-secondary">Mot de passe actuel</span>
                            <input
                                type="password"
                                value={pwd.current}
                                onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                                required
                                autoComplete="current-password"
                                className="w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm outline-none transition focus:border-brand-secondary/40 focus:ring-2 focus:ring-brand-secondary/15"
                            />
                        </label>
                        <label className="grid gap-1 text-sm">
                            <span className="text-xs font-medium text-secondary">Nouveau mot de passe</span>
                            <input
                                type="password"
                                value={pwd.next}
                                onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                                required
                                minLength={8}
                                autoComplete="new-password"
                                className="w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm outline-none transition focus:border-brand-secondary/40 focus:ring-2 focus:ring-brand-secondary/15"
                            />
                        </label>
                        {pwd.next ? (
                            <div className="rounded-lg border border-secondary/80 bg-secondary_subtle/25 px-2.5 py-2">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-medium text-secondary">Force (local)</span>
                                    <span className="text-tertiary">{pwdStrength.label}</span>
                                </div>
                                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                                    <div
                                        className={cx("h-full rounded-full transition-all", pwdStrength.barClass)}
                                        style={{ width: `${pwdStrength.score}%` }}
                                    />
                                </div>
                            </div>
                        ) : null}
                        <label className="grid gap-1 text-sm">
                            <span className="text-xs font-medium text-secondary">Confirmation</span>
                            <input
                                type="password"
                                value={pwd.confirm}
                                onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                                required
                                minLength={8}
                                autoComplete="new-password"
                                className="w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm outline-none transition focus:border-brand-secondary/40 focus:ring-2 focus:ring-brand-secondary/15"
                            />
                        </label>
                        {pwdMsg ? (
                            <div
                                className={cx(
                                    "rounded-lg border px-3 py-2 text-sm",
                                    pwdMsg.type === "ok"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
                                        : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100",
                                )}
                            >
                                {pwdMsg.text}
                            </div>
                        ) : null}
                        <button
                            type="submit"
                            disabled={changePassword.isPending || !pwd.current || !pwd.next || !pwd.confirm}
                            className="rounded-xl border border-secondary bg-primary_alt px-4 py-2 text-sm font-semibold text-primary transition hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {changePassword.isPending ? "Changement…" : "Changer le mot de passe"}
                        </button>
                    </form>
                </section>

                <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm ring-1 ring-secondary/25 lg:p-5">
                    <h2 className="text-sm font-semibold text-primary">Préférences de notifications</h2>
                    <p className="mt-1 text-xs text-tertiary">Stockées sur cet appareil (aucun appel API supplémentaire).</p>
                    <div className="mt-4 space-y-3 text-sm">
                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                className="mt-1 size-4 rounded border-secondary"
                                checked={managerNotifPrefs.digest}
                                onChange={(e) => persistManagerNotif({ ...managerNotifPrefs, digest: e.target.checked })}
                            />
                            <span>
                                <span className="font-medium text-primary">Synthèses et rappels par e-mail</span>
                                <span className="mt-0.5 block text-xs text-tertiary">Indique votre intérêt pour des récapitulatifs (paramétrage serveur à prévoir).</span>
                            </span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                className="mt-1 size-4 rounded border-secondary"
                                checked={managerNotifPrefs.criticalOnly}
                                onChange={(e) => persistManagerNotif({ ...managerNotifPrefs, criticalOnly: e.target.checked })}
                            />
                            <span>
                                <span className="font-medium text-primary">Limiter aux alertes critiques / élevées</span>
                                <span className="mt-0.5 block text-xs text-tertiary">Réduit le bruit dans l’interface lorsque c’est possible.</span>
                            </span>
                        </label>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className={cx("mx-auto max-w-5xl space-y-5 px-4 py-5 lg:py-8", embeddedInTalent && "max-w-4xl py-4")}>
            {!embeddedInTalent ? (
                <PageHero
                    eyebrow="Espace compte"
                    title="Compte & sécurité"
                    subtitle="Identité, sécurité et conformité de votre compte."
                    badge={roleLabel(user.role)}
                    metrics={
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                            <div className="flex items-center gap-3">
                                <Avatar
                                    key={user.avatar_url ?? "no-avatar"}
                                    size="2xl"
                                    className="shadow-md ring-2 ring-white/10"
                                    src={user.avatar_url?.trim() || undefined}
                                    initials={initials}
                                    alt={user.full_name || "Sans nom"}
                                    contrastBorder
                                />
                                <div className="min-w-0">
                                    <p className="truncate text-base font-semibold text-primary">{user.full_name || "Sans nom"}</p>
                                    <p className="truncate text-sm text-secondary">{user.email}</p>
                                    <p className="mt-0.5 truncate text-xs text-tertiary">{user.enterprise_name || "—"}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 sm:ml-auto">
                                <span
                                    className={cx(
                                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                                        isActive
                                            ? "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-800"
                                            : "bg-secondary_subtle text-secondary ring-secondary",
                                    )}
                                >
                                    {statusLabel(user.status)}
                                </span>
                                <span className="inline-flex rounded-full bg-brand-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-secondary ring-1 ring-brand-secondary/25">
                                    {roleLabel(user.role)}
                                </span>
                            </div>
                        </div>
                    }
                />
            ) : (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-secondary bg-primary px-4 py-3 shadow-sm">
                    <Avatar
                        key={user.avatar_url ?? "no-avatar"}
                        size="lg"
                        src={user.avatar_url?.trim() || undefined}
                        initials={initials}
                        alt={user.full_name || "Compte"}
                        contrastBorder
                    />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-primary">{user.full_name || "Compte"}</p>
                        <p className="truncate text-xs text-tertiary">{user.email}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100">
                                {statusLabel(user.status)}
                            </span>
                            <span className="rounded-full bg-brand-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-brand-secondary">
                                {roleLabel(user.role)}
                            </span>
                            {user.enterprise_name ? <span className="truncate text-[10px] text-tertiary">{user.enterprise_name}</span> : null}
                        </div>
                    </div>
                </div>
            )}

            {user.must_change_password ? (
                <div
                    className="flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/25"
                    role="status"
                >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100">
                        <AlertTriangle className="size-4" aria-hidden />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">Action requise</p>
                        <p className="mt-0.5 text-sm text-amber-900/95 dark:text-amber-100/90">
                            Définis un nouveau mot de passe pour sécuriser ton compte.
                        </p>
                    </div>
                </div>
            ) : null}

            {passwordExpiresInDays != null && passwordExpiresInDays < 30 && passwordExpiresInDays >= 0 ? (
                <div className="flex items-start gap-2 rounded-xl border border-secondary bg-primary_alt/40 px-3 py-2.5 text-sm text-secondary">
                    <Key01 className="mt-0.5 size-4 shrink-0 text-tertiary" aria-hidden />
                    <p>
                        Mot de passe : expire dans <strong className="text-primary">{passwordExpiresInDays}</strong> jour(s).
                    </p>
                </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
                <div className="space-y-5">
                    <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm ring-1 ring-secondary/25 lg:p-5">
                        <div className="mb-4 flex items-start gap-2.5">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-secondary_subtle text-secondary">
                                <User01 className="size-4" aria-hidden />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-primary">Identité</h2>
                                <p className="text-xs text-tertiary">Nom et e-mail de connexion.</p>
                            </div>
                        </div>
                        <form onSubmit={handleProfileSubmit} className="space-y-3">
                            <label className="grid gap-1 text-sm">
                                <span className="text-xs font-medium text-secondary">Nom complet</span>
                                <input
                                    type="text"
                                    value={profile.full_name}
                                    onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                                    required
                                    className="w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm outline-none transition focus:border-brand-secondary/40 focus:ring-2 focus:ring-brand-secondary/15"
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span className="text-xs font-medium text-secondary">E-mail</span>
                                <input
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                                    required
                                    className="w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm outline-none transition focus:border-brand-secondary/40 focus:ring-2 focus:ring-brand-secondary/15"
                                />
                            </label>
                            {profileMsg ? (
                                <div
                                    className={cx(
                                        "rounded-lg border px-3 py-2 text-sm",
                                        profileMsg.type === "ok"
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
                                            : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100",
                                    )}
                                >
                                    {profileMsg.text}
                                </div>
                            ) : null}
                            <button
                                type="submit"
                                disabled={updateProfile.isPending || profileUnchanged}
                                className="rounded-xl bg-brand-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {updateProfile.isPending ? "Enregistrement…" : "Enregistrer"}
                            </button>
                        </form>
                    </section>

                    <section id="security-password" className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm ring-1 ring-secondary/25 lg:p-5">
                        <div className="mb-4 flex items-start gap-2.5">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-secondary_subtle text-secondary">
                                <ShieldTick className="size-4" aria-hidden />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-primary">Mot de passe</h2>
                                <p className="text-xs text-tertiary">Déconnexion possible de toutes les sessions selon politique.</p>
                            </div>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className="space-y-3">
                            <label className="grid gap-1 text-sm">
                                <span className="text-xs font-medium text-secondary">Mot de passe actuel</span>
                                <input
                                    type="password"
                                    value={pwd.current}
                                    onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                                    required
                                    autoComplete="current-password"
                                    className="w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm outline-none transition focus:border-brand-secondary/40 focus:ring-2 focus:ring-brand-secondary/15"
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span className="text-xs font-medium text-secondary">Nouveau mot de passe</span>
                                <input
                                    type="password"
                                    value={pwd.next}
                                    onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    className="w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm outline-none transition focus:border-brand-secondary/40 focus:ring-2 focus:ring-brand-secondary/15"
                                />
                            </label>
                            {pwd.next ? (
                                <div className="rounded-lg border border-secondary/80 bg-secondary_subtle/25 px-2.5 py-2">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="font-medium text-secondary">Force (local)</span>
                                        <span className="text-tertiary">{pwdStrength.label}</span>
                                    </div>
                                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                                        <div
                                            className={cx("h-full rounded-full transition-all", pwdStrength.barClass)}
                                            style={{ width: `${pwdStrength.score}%` }}
                                        />
                                    </div>
                                </div>
                            ) : null}
                            <label className="grid gap-1 text-sm">
                                <span className="text-xs font-medium text-secondary">Confirmation</span>
                                <input
                                    type="password"
                                    value={pwd.confirm}
                                    onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    className="w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm outline-none transition focus:border-brand-secondary/40 focus:ring-2 focus:ring-brand-secondary/15"
                                />
                            </label>
                            {pwdMsg ? (
                                <div
                                    className={cx(
                                        "rounded-lg border px-3 py-2 text-sm",
                                        pwdMsg.type === "ok"
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
                                            : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100",
                                    )}
                                >
                                    {pwdMsg.text}
                                </div>
                            ) : null}
                            <button
                                type="submit"
                                disabled={changePassword.isPending || !pwd.current || !pwd.next || !pwd.confirm}
                                className="rounded-xl border border-secondary bg-primary_alt px-4 py-2 text-sm font-semibold text-primary transition hover:bg-secondary_subtle disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {changePassword.isPending ? "Changement…" : "Changer le mot de passe"}
                            </button>
                        </form>
                    </section>
                </div>

                <div className="space-y-5">
                    <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm ring-1 ring-brand-secondary/10 lg:p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-primary">Score de sécurité</h2>
                                <p className="text-xs text-tertiary">Indicateur local /100.</p>
                            </div>
                            <span
                                className={cx(
                                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset",
                                    securityScore.label === "Excellent" &&
                                        "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100",
                                    securityScore.label === "Moyen" &&
                                        "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100",
                                    securityScore.label === "À sécuriser" &&
                                        "bg-red-50 text-red-900 ring-red-200 dark:bg-red-950/40 dark:text-red-100",
                                )}
                            >
                                {securityScore.label}
                            </span>
                        </div>
                        <div className="mt-4 flex items-end gap-2">
                            <p className="text-3xl font-bold tabular-nums text-primary lg:text-4xl">{securityScore.total}</p>
                            <span className="pb-1 text-base font-medium text-tertiary">/100</span>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm ring-1 ring-secondary/25 lg:p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <ShieldTick className="size-4 text-brand-secondary" aria-hidden />
                            <h2 className="text-sm font-semibold text-primary">Sécurité du compte</h2>
                        </div>
                        <dl className="grid gap-2.5 sm:grid-cols-2">
                            <ComplianceCell label="Rôle" value={roleLabel(user.role)} badge />
                            <ComplianceCell label="Statut" value={statusLabel(user.status)} badge />
                            <ComplianceCell label="Entreprise" value={user.enterprise_name || "—"} className="sm:col-span-2" />
                            <ComplianceCell
                                icon={<Clock className="size-3.5" />}
                                label="Membre depuis"
                                value={new Date(user.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                            />
                            <ComplianceCell
                                icon={<Clock className="size-3.5" />}
                                label="Dernière modification"
                                value={new Date(user.updated_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                            />
                            <ComplianceCell
                                icon={<Key01 className="size-3.5" />}
                                label="Expiration mot de passe"
                                value={
                                    user.password_expires_at
                                        ? new Date(user.password_expires_at).toLocaleDateString("fr-FR", { dateStyle: "long" })
                                        : "—"
                                }
                                className="sm:col-span-2"
                            />
                            <MaskedIdCell
                                label="Code compte"
                                display={accountCodeDisplay}
                                copyValue={user.id}
                                onCopy={() => void copyToClipboard(user.id, "identifiant compte")}
                            />
                            <MaskedIdCell
                                label="Code entreprise"
                                display={enterpriseCodeDisplay}
                                copyValue={user.enterprise_id}
                                onCopy={() => void copyToClipboard(user.enterprise_id, "identifiant entreprise")}
                            />
                        </dl>
                    </section>
                </div>
            </div>

            {talent ? (
                <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm ring-1 ring-secondary/25 lg:p-5">
                    <h2 className="text-sm font-semibold text-primary">Profil talent</h2>
                    <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
                        <ComplianceCell label="Nom talent" value={talent.name} />
                        <ComplianceCell
                            label="Fin de contrat"
                            value={talent.contract_end_date ? new Date(talent.contract_end_date).toLocaleDateString("fr-FR") : "CDI / non défini"}
                        />
                    </dl>
                </section>
            ) : null}
        </div>
    );
}

function ComplianceCell({
    label,
    value,
    icon,
    badge,
    className,
}: {
    label: string;
    value: string;
    icon?: ReactNode;
    badge?: boolean;
    className?: string;
}) {
    return (
        <div className={cx("rounded-lg border border-secondary/60 bg-primary_alt/25 px-2.5 py-2", className)}>
            <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                {icon}
                {label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-primary">
                {badge ? (
                    <span className="inline-flex rounded-full bg-secondary_subtle px-2 py-0.5 text-xs font-semibold text-secondary ring-1 ring-secondary/50">
                        {value}
                    </span>
                ) : (
                    value || "—"
                )}
            </dd>
        </div>
    );
}

function MaskedIdCell({
    label,
    display,
    copyValue,
    onCopy,
}: {
    label: string;
    display: string;
    copyValue: string;
    onCopy: () => void;
}) {
    return (
        <div className="rounded-lg border border-secondary/60 bg-primary_alt/25 px-2.5 py-2 sm:col-span-1">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{label}</dt>
            <dd className="mt-1 flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium text-primary">{display}</span>
                {copyValue ? (
                    <button
                        type="button"
                        title="Copier l’identifiant technique (usage interne)"
                        onClick={onCopy}
                        className="shrink-0 rounded-md border border-transparent p-1 text-tertiary transition hover:border-secondary hover:bg-primary hover:text-primary"
                    >
                        <Copy01 className="size-4" aria-hidden />
                        <span className="sr-only">Copier</span>
                    </button>
                ) : null}
            </dd>
        </div>
    );
}
