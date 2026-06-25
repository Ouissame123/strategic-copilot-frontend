import { EditableSection } from "@/components/talent/profile/EditableSection";
import { IdentitySection } from "@/components/talent/profile/IdentitySection";
import { SecuritySection } from "@/components/talent/profile/SecuritySection";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useTalentProfile } from "@/hooks/useTalentProfile";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";

import { TALENT_PAGE_STACK } from "@/components/talent/ui/talent-workspace-ui";

export function TalentProfilePage() {
    useCopilotPage("none", "Mon profil");

    const profileQuery = useTalentProfile();
    const profileName = profileQuery.data?.profile.name;
    useWorkspaceTopbarMeta("Mon profil", profileName ? `${profileName} · Gérer mes infos personnelles` : "Gérer mes infos personnelles");

    if (profileQuery.isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-40 animate-pulse rounded-2xl bg-secondary" />
                ))}
            </div>
        );
    }

    if (profileQuery.isError || !profileQuery.data) {
        return (
            <ErrorState
                title="Profil indisponible"
                message="Impossible de charger votre profil."
                detail={
                    profileQuery.error instanceof Error ? profileQuery.error.message : String(profileQuery.error ?? "")
                }
                onRetry={() => void profileQuery.refetch()}
            />
        );
    }

    const { profile, editable_fields } = profileQuery.data;
    const mustChangePassword = profile.account.must_change_password;

    return (
        <div className={TALENT_PAGE_STACK}>
            <IdentitySection profile={profile} />
            <EditableSection editable={profile.editable} editableFields={editable_fields} />
            <SecuritySection mustChangePassword={mustChangePassword} autoOpenPasswordModal={mustChangePassword} />
        </div>
    );
}
