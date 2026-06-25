import { AlertTriangle, CheckCircle2, KeyRound, UserPlus } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { AccountsHealthEmptyState, SkeletonRows } from "@/components/rh/accounts-health/EmptyState";
import { useOrphanedAccounts } from "@/hooks/use-rh-accounts-audit";
import type { OrphanedItem } from "@/types/rh-accounts-audit.types";
import { formatDateRelative } from "@/utils/format";
import { cx } from "@/utils/cx";

type OrphanedAccountsTabProps = {
    onOnboardTalent: (talentId: string) => void;
};

function getInitials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function UserInfo({ name, email, subtitle }: { name: string; email: string; subtitle: string | null }) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-secondary/10 text-[10px] font-semibold text-primary">
                {getInitials(name)}
            </div>
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary">{name}</p>
                <p className="truncate text-xs text-tertiary">
                    {email}
                    {subtitle ? ` · ${subtitle}` : ""}
                </p>
            </div>
        </div>
    );
}

function OrphanSection({
    title,
    description,
    icon,
    tone,
    children,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    tone?: "critical";
    children: React.ReactNode;
}) {
    return (
        <div
            className={cx(
                "overflow-hidden rounded-lg border border-secondary bg-primary",
                tone === "critical" && "border-error-primary/30",
            )}
        >
            <div className="border-b border-secondary bg-secondary_subtle/40 px-4 py-3">
                <div className="flex items-center gap-2">
                    {icon}
                    <h4 className="text-sm font-medium text-primary">{title}</h4>
                </div>
                <p className="mt-0.5 text-xs text-tertiary">{description}</p>
            </div>
            <div className="divide-y divide-secondary">{children}</div>
        </div>
    );
}

function OrphanRow({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 hover:bg-secondary_subtle/30">
            {children}
        </div>
    );
}

export function OrphanedAccountsTab({ onOnboardTalent }: OrphanedAccountsTabProps) {
    const { data, isLoading } = useOrphanedAccounts(200);
    const items = data?.items ?? [];
    const talentsNoAccount = items.filter((i) => i.issue === "talent_without_account");
    const accountsNoTalent = items.filter((i) => i.issue === "account_without_talent");

    if (isLoading) return <SkeletonRows count={5} />;

    if ((data?.count ?? 0) === 0) {
        return (
            <AccountsHealthEmptyState
                icon={<CheckCircle2 className="size-12 text-emerald-500" aria-hidden />}
                title="Aucune anomalie détectée"
                description="Tous les comptes et talents sont correctement liés."
            />
        );
    }

    return (
        <div className="space-y-6">
            {talentsNoAccount.length > 0 ? (
                <OrphanSection
                    title={`Talents actifs sans compte d'accès (${talentsNoAccount.length})`}
                    description="Ces talents peuvent être onboardés pour accéder au portail."
                    icon={<UserPlus className="size-4 text-amber-600" aria-hidden />}
                >
                    {talentsNoAccount.map((t) => (
                        <OrphanTalentRow key={t.talent_id} item={t} onOnboard={() => onOnboardTalent(t.talent_id)} />
                    ))}
                </OrphanSection>
            ) : null}

            {accountsNoTalent.length > 0 ? (
                <OrphanSection
                    title={`Comptes talent sans fiche associée (${accountsNoTalent.length})`}
                    description="Comptes role=talent sans fiche talent liée — anomalie à investiguer."
                    icon={<AlertTriangle className="size-4 text-error-primary" aria-hidden />}
                    tone="critical"
                >
                    {accountsNoTalent.map((u) => (
                        <OrphanRow key={u.talent_id}>
                            <UserInfo name={u.name} email={u.email} subtitle="Compte talent orphelin" />
                            <Badge color="error" size="sm">
                                À investiguer
                            </Badge>
                        </OrphanRow>
                    ))}
                </OrphanSection>
            ) : null}
        </div>
    );
}

function OrphanTalentRow({ item, onOnboard }: { item: OrphanedItem; onOnboard: () => void }) {
    return (
        <OrphanRow>
            <UserInfo name={item.name} email={item.email} subtitle={item.job_title} />
            <div className="flex items-center gap-2">
                <span className="text-xs text-tertiary">Créé {formatDateRelative(item.created_at)}</span>
                <Button type="button" color="primary" size="sm" iconLeading={KeyRound} onClick={onOnboard}>
                    Onboarder
                </Button>
            </div>
        </OrphanRow>
    );
}
