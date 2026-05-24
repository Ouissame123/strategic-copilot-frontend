import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useChangePassword, useMe, useUpdateProfile } from "@/hooks/useMe";
import { useAuth } from "@/hooks/useAuth";
import { authStorage } from "@/lib/auth-storage";
import { readStoredUiLang } from "@/lib/ui-locale";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";
import { ProfileIdentityCard } from "./ProfileIdentityCard";
import { ProfileSkeleton } from "./ProfileSkeleton";
import { ProfileTabAccount } from "./ProfileTabAccount";
import { ProfileTabAiPreferences } from "./ProfileTabAiPreferences";
import { ProfileTabNotifications } from "./ProfileTabNotifications";
import { ProfileTabSecurity } from "./ProfileTabSecurity";
import { ProfileTabs } from "./ProfileTabs";
import type { NotifChannel, NotifMatrixRow } from "./NotificationMatrix";
import {
    DEFAULT_AI_PREFS,
    DEFAULT_NOTIF_MATRIX_ROWS,
    MANAGER_ACCOUNT_PREFS_KEY,
    MANAGER_AI_PREFS_KEY,
    MANAGER_COMPANY_FALLBACK,
    MANAGER_NOTIF_MATRIX_KEY,
    isValidEmail,
    type ManagerAccountPrefs,
    type ManagerAiPrefs,
    type ProfileTabId,
} from "./profile-shared";

const DEMO_FALLBACK = {
    fullName: "Carlos Mendoza",
    email: "manager1@demo.com",
    company: MANAGER_COMPANY_FALLBACK,
};

function loadJson<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return { ...fallback, ...JSON.parse(raw) } as T;
    } catch {
        return fallback;
    }
}

function rowsEqual(a: NotifMatrixRow[], b: NotifMatrixRow[]): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function ManagerProfileView() {
    const navigate = useNavigate();
    const { data, isLoading, isError } = useMe();
    const updateProfile = useUpdateProfile();
    const changePassword = useChangePassword();
    const { logout, syncSession } = useAuth();
    const { push: pushToast } = useToast();
    const { theme, setTheme } = useTheme();

    const [activeTab, setActiveTab] = useState<ProfileTabId>("account");
    const [logoutPending, setLogoutPending] = useState(false);

    const [profile, setProfile] = useState({ full_name: "", email: "" });
    const [savedProfile, setSavedProfile] = useState({ full_name: "", email: "" });

    const [accountPrefs, setAccountPrefs] = useState<ManagerAccountPrefs>(() =>
        loadJson(MANAGER_ACCOUNT_PREFS_KEY, { language: readStoredUiLang(), timezone: "Europe/Paris" }),
    );
    const [savedAccountPrefs, setSavedAccountPrefs] = useState<ManagerAccountPrefs>(accountPrefs);
    const [savedTheme, setSavedTheme] = useState(theme);

    const [notifRows, setNotifRows] = useState<NotifMatrixRow[]>(() =>
        loadJson(MANAGER_NOTIF_MATRIX_KEY, [...DEFAULT_NOTIF_MATRIX_ROWS]),
    );
    const [savedNotifRows, setSavedNotifRows] = useState<NotifMatrixRow[]>(notifRows);
    const [notifSaving, setNotifSaving] = useState(false);

    const [aiPrefs, setAiPrefs] = useState<ManagerAiPrefs>(() => loadJson(MANAGER_AI_PREFS_KEY, DEFAULT_AI_PREFS));
    const [savedAiPrefs, setSavedAiPrefs] = useState<ManagerAiPrefs>(aiPrefs);
    const [aiSaving, setAiSaving] = useState(false);

    const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
    const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

    const user = data?.user;

    useEffect(() => {
        if (!user) return;
        const next = { full_name: user.full_name ?? DEMO_FALLBACK.fullName, email: user.email ?? DEMO_FALLBACK.email };
        setProfile(next);
        setSavedProfile(next);
    }, [user]);

    const displayName = profile.full_name.trim() || user?.full_name?.trim() || DEMO_FALLBACK.fullName;
    const displayEmail = profile.email.trim() || user?.email?.trim() || DEMO_FALLBACK.email;
    const company = user?.enterprise_name?.trim() || DEMO_FALLBACK.company;

    const profileFieldErrors = useMemo(() => {
        const errors: { fullName?: string; email?: string } = {};
        if (!profile.full_name.trim()) errors.fullName = "Le nom est requis.";
        if (!isValidEmail(profile.email)) errors.email = "Adresse e-mail invalide.";
        return errors;
    }, [profile]);

    const profileValid = Object.keys(profileFieldErrors).length === 0;

    const accountDirty =
        profile.full_name !== savedProfile.full_name ||
        profile.email !== savedProfile.email ||
        accountPrefs.language !== savedAccountPrefs.language ||
        accountPrefs.timezone !== savedAccountPrefs.timezone ||
        theme !== savedTheme;

    const canSaveAccount = accountDirty && profileValid && !updateProfile.isPending;

    const passwordDirty = Boolean(pwd.current || pwd.next || pwd.confirm);
    const passwordValid =
        pwd.current.length > 0 &&
        pwd.next.length >= 8 &&
        pwd.next === pwd.confirm &&
        pwd.next !== pwd.current;
    const canSubmitPassword = passwordDirty && passwordValid && !changePassword.isPending;

    const notifDirty = !rowsEqual(notifRows, savedNotifRows);
    const aiDirty = JSON.stringify(aiPrefs) !== JSON.stringify(savedAiPrefs);

    const passwordExpiresInDays = useMemo(() => {
        if (!user?.password_expires_at) return null;
        return Math.floor((new Date(user.password_expires_at).getTime() - Date.now()) / 86400000);
    }, [user?.password_expires_at]);

    const handleAvatarChange = useCallback(
        async (publicUrl: string) => {
            const finalUrl = `${publicUrl}${publicUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
            await updateProfile.mutateAsync({ avatar_url: finalUrl });
            await syncSession();
        },
        [updateProfile, syncSession],
    );

    const handleAccountSave = async () => {
        if (!canSaveAccount) return;
        try {
            if (profile.full_name !== savedProfile.full_name || profile.email !== savedProfile.email) {
                await updateProfile.mutateAsync({
                    full_name: profile.full_name.trim(),
                    email: profile.email.trim(),
                });
            }
            localStorage.setItem(MANAGER_ACCOUNT_PREFS_KEY, JSON.stringify(accountPrefs));
            setSavedProfile({ ...profile });
            setSavedAccountPrefs({ ...accountPrefs });
            setSavedTheme(theme);
            pushToast("Paramètres du compte enregistrés.", "success");
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                "Erreur lors de la sauvegarde.";
            pushToast(message, "error");
        }
    };

    const handlePasswordSubmit = async () => {
        if (!canSubmitPassword) return;
        setPwdMsg(null);
        try {
            const res = await changePassword.mutateAsync({
                current_password: pwd.current,
                new_password: pwd.next,
            });
            setPwd({ current: "", next: "", confirm: "" });
            setPwdMsg({ type: "ok", text: "Mot de passe changé. Redirection vers login…" });
            pushToast("Mot de passe mis à jour.", "success");
            if (res.security?.requires_relogin) {
                authStorage.clear();
                setTimeout(() => navigate("/login"), 1500);
            }
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                "Mot de passe actuel incorrect.";
            setPwdMsg({ type: "err", text: message });
            pushToast(message, "error");
        }
    };

    const handleNotifChange = (id: string, channel: NotifChannel, value: boolean) => {
        setNotifRows((rows) =>
            rows.map((r) => {
                if (r.id !== id) return r;
                if (channel === "email") return { ...r, email: value };
                if (channel === "inApp") return { ...r, inApp: value };
                if (r.slackDisabled) return r;
                return { ...r, slack: value };
            }),
        );
    };

    const handleNotifSave = () => {
        if (!notifDirty) return;
        setNotifSaving(true);
        try {
            localStorage.setItem(MANAGER_NOTIF_MATRIX_KEY, JSON.stringify(notifRows));
            setSavedNotifRows([...notifRows]);
            pushToast("Préférences de notification enregistrées.", "success");
        } finally {
            setNotifSaving(false);
        }
    };

    const handleAiSave = () => {
        if (!aiDirty) return;
        setAiSaving(true);
        try {
            localStorage.setItem(MANAGER_AI_PREFS_KEY, JSON.stringify(aiPrefs));
            setSavedAiPrefs({ ...aiPrefs });
            pushToast("Préférences IA enregistrées.", "success");
        } finally {
            setAiSaving(false);
        }
    };

    const handleLogout = async () => {
        setLogoutPending(true);
        try {
            await logout();
            navigate("/login");
        } catch {
            pushToast("Impossible de se déconnecter.", "error");
        } finally {
            setLogoutPending(false);
        }
    };

    const handleRevokeSession = (id: string) => {
        setSessions((s) => s.filter((x) => x.id !== id));
        pushToast("Session révoquée.", "success");
    };

    if (isLoading) {
        return (
            <div className="px-1 py-2 sm:px-2">
                <ProfileSkeleton />
            </div>
        );
    }

    if (isError || data === null || !user) {
        return (
            <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="font-medium text-slate-900 dark:text-slate-50">Profil indisponible</p>
                <p className="mt-2 text-sm text-slate-500">Reconnectez-vous pour accéder à votre espace.</p>
                <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                >
                    Connexion
                </button>
            </div>
        );
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-8">
            <ProfileIdentityCard
                userId={user.id}
                fullName={displayName}
                email={displayEmail}
                company={company}
                avatarUrl={user.avatar_url ?? undefined}
                onChange={handleAvatarChange}
                onLogout={handleLogout}
                logoutPending={logoutPending}
            />

            <div className="min-w-0 space-y-5">
                <ProfileTabs active={activeTab} onChange={setActiveTab} />

                <div className="transition-opacity duration-200">
                    {activeTab === "account" ? (
                        <ProfileTabAccount
                            fullName={profile.full_name}
                            email={profile.email}
                            prefs={accountPrefs}
                            theme={theme}
                            onFullNameChange={(v) => setProfile((p) => ({ ...p, full_name: v }))}
                            onEmailChange={(v) => setProfile((p) => ({ ...p, email: v }))}
                            onPrefsChange={setAccountPrefs}
                            onThemeChange={setTheme}
                            onSubmit={() => void handleAccountSave()}
                            saving={updateProfile.isPending}
                            canSave={canSaveAccount}
                            fieldErrors={profileFieldErrors}
                        />
                    ) : null}

                    {activeTab === "security" ? (
                        <ProfileTabSecurity
                            password={pwd}
                            onPasswordChange={setPwd}
                            onPasswordSubmit={() => void handlePasswordSubmit()}
                            passwordSaving={changePassword.isPending}
                            canSubmitPassword={canSubmitPassword}
                            passwordMessage={pwdMsg}
                            mustChangePassword={user.must_change_password}
                            passwordExpiresInDays={passwordExpiresInDays}
                        />
                    ) : null}

                    {activeTab === "notifications" ? (
                        <ProfileTabNotifications
                            rows={notifRows}
                            onChange={handleNotifChange}
                            onSave={handleNotifSave}
                            saving={notifSaving}
                            canSave={notifDirty && !notifSaving}
                        />
                    ) : null}

                    {activeTab === "ai" ? (
                        <ProfileTabAiPreferences
                            prefs={aiPrefs}
                            onChange={setAiPrefs}
                            onSave={handleAiSave}
                            saving={aiSaving}
                            canSave={aiDirty && !aiSaving}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
