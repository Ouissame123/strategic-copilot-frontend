import { Avatar } from "@/components/base/avatar/avatar";
import {
    formatProfileDate,
    profileInitials,
    STATUS_BADGE,
    statusBadgeClass,
} from "@/components/talent/profile/talent-profile-ui";
import { TALENT_SURFACE } from "@/components/talent/ui/talent-workspace-ui";
import type { TalentProfile } from "@/types/talent-profile";
import { cx } from "@/utils/cx";

type IdentitySectionProps = {
    profile: TalentProfile;
};

function InfoCell({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
            <p className="mt-1 text-sm font-medium text-primary">{value?.trim() ? value : "—"}</p>
        </div>
    );
}

export function IdentitySection({ profile }: IdentitySectionProps) {
    const statusKey = profile.status?.toLowerCase() ?? "";
    const statusMeta = STATUS_BADGE[statusKey];
    const statusLabel = statusMeta?.label ?? profile.status ?? "—";
    const statusTone = statusMeta?.tone ?? "slate";

    return (
        <section className={cx(TALENT_SURFACE, "p-4 sm:p-5")}>
            <h2 className="text-sm font-semibold text-primary">Identité</h2>
            <p className="text-[10px] text-tertiary">Informations professionnelles (lecture seule)</p>

            <div className="mt-4 flex flex-wrap items-start gap-4">
                <Avatar size="lg" initials={profileInitials(profile.name)} alt={profile.name} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-primary">{profile.name}</p>
                        <span className={statusBadgeClass(statusTone)}>{statusLabel}</span>
                    </div>
                    <p className="mt-1 text-sm text-secondary">{profile.email}</p>
                </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoCell label="Poste" value={profile.job_title} />
                <InfoCell label="Département" value={profile.department} />
                <InfoCell label="Séniorité" value={profile.seniority_level} />
                <InfoCell label="Date d'embauche" value={formatProfileDate(profile.hire_date)} />
                <InfoCell label="Fin de contrat" value={formatProfileDate(profile.contract_end_date)} />
                <InfoCell
                    label="Manager assigné"
                    value={profile.manager ? `${profile.manager.name} · ${profile.manager.email}` : null}
                />
            </div>

            <p className="mt-5 text-xs text-tertiary">Ces informations sont gérées par votre RH.</p>
        </section>
    );
}
