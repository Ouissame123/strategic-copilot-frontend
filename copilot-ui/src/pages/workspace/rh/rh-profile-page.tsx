import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { changeRhStaffPassword } from "@/api/rh-accounts.api";
import { fetchRhProfile, patchRhProfile, rhProfileApiToastMessage } from "@/api/rh-profile.api";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import {
    MustChangePasswordBanner,
    PasswordChangeForm,
    ProfileEditForm,
    ProfileIdentityCard,
} from "@/features/rh/profile";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useAuth } from "@/hooks/useAuth";
import { authStorage } from "@/lib/auth-storage";
import { useToast } from "@/providers/toast-provider";
import type { RhProfile } from "@/types/rh-profile.types";
import { RH_PROFILE_CARD } from "@/features/rh/profile/profile-ui";
import { WS_BTN_PRIMARY } from "@/utils/rh-workspace-theme";
import { setApiAuthToken } from "@/utils/apiClient";
import { cx } from "@/utils/cx";

function ProfileLoadingSkeleton() {
    return (
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className={cx(RH_PROFILE_CARD, "h-72 animate-pulse")} />
            <div className="space-y-6">
                <div className={cx(RH_PROFILE_CARD, "h-52 animate-pulse")} />
                <div className={cx(RH_PROFILE_CARD, "h-64 animate-pulse")} />
            </div>
        </div>
    );
}

/** Route `/workspace/rh/profile` — profil connecté au backend RH. */
export default function RhProfilePage() {
    const { t } = useTranslation("nav");
    const { t: tCommon } = useTranslation("common");
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
    const [passwordRequirementCleared, setPasswordRequirementCleared] = useState(false);
    const [logoutPending, setLogoutPending] = useState(false);

    const newPasswordInputRef = useRef<HTMLInputElement>(null);
    const passwordSectionRef = useRef<HTMLElement>(null);

    useCopilotPage();

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
        editFullName.trim() !== savedFullName.trim() || editAvatarUrl.trim() !== savedAvatarUrl.trim();
    const profileValid = editFullName.trim().length > 0;
    const canSaveProfile = profileDirty && profileValid && !profileSaving;

    const pwdValid = pwdNext.length >= 8 && pwdNext === pwdConfirm;
    const canSubmitPassword = pwdValid && !pwdSaving;

    const showPasswordRequirement = Boolean(profile?.must_change_password) && !passwordRequirementCleared;

    const focusPasswordField = useCallback(() => {
        passwordSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => {
            newPasswordInputRef.current?.focus();
        }, 280);
    }, []);

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
            pushToast("Profil mis à jour", "success");
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
            setPasswordRequirementCleared(true);
            setPwdNext("");
            setPwdConfirm("");
            pushToast("Mot de passe mis à jour — reconnexion requise", "success");
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

    /** Même flux que la sidebar (`SidebarNavigationSimple`). */
    const handleLogout = () => {
        setLogoutPending(true);
        void logout().finally(() => {
            navigate("/login", { replace: true });
            setLogoutPending(false);
        });
    };

    const title = t("profile");

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow={tCommon("rhPlaceholder.eyebrow")}
            title={title}
            description={false}
            omitHeader
        >
            {showPasswordRequirement ? <MustChangePasswordBanner onActivate={focusPasswordField} /> : null}

            {loading && !profile ? (
                <ProfileLoadingSkeleton />
            ) : loadError && !profile ? (
                <div className="mx-auto max-w-lg">
                    <div className={cx(RH_PROFILE_CARD, "p-6 text-center")}>
                        <p className="text-sm text-slate-800 dark:text-slate-100">{loadError}</p>
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
                <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
                    <div className="order-1">
                        <ProfileIdentityCard
                            fullName={profile.full_name}
                            email={profile.email}
                            roleBadge="RH"
                            roleLabel="Ressources Humaines"
                            avatarUrl={profile.avatar_url}
                            createdAt={profile.created_at}
                            onLogout={handleLogout}
                            logoutPending={logoutPending}
                        />
                    </div>

                    <div className="order-2 min-w-0 space-y-6">
                        <ProfileEditForm
                            fullName={editFullName}
                            avatarUrl={editAvatarUrl}
                            emailForInitials={profile.email}
                            onFullNameChange={setEditFullName}
                            onAvatarUrlChange={setEditAvatarUrl}
                            onSubmit={(e) => void handleProfileSave(e)}
                            canSave={canSaveProfile}
                            saving={profileSaving}
                        />

                        <PasswordChangeForm
                            ref={passwordSectionRef}
                            newPasswordInputRef={newPasswordInputRef}
                            nextPassword={pwdNext}
                            confirmPassword={pwdConfirm}
                            onNextPasswordChange={setPwdNext}
                            onConfirmPasswordChange={setPwdConfirm}
                            onSubmit={(e) => void handlePasswordSubmit(e)}
                            canSubmit={canSubmitPassword}
                            saving={pwdSaving}
                            showRequiredBadge={showPasswordRequirement}
                        />
                    </div>
                </div>
            ) : null}
        </WorkspacePageShell>
    );
}
