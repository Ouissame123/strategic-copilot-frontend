import { Eye, Power, Trash2 } from "lucide-react";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { PortalAccessBadge } from "@/components/rh/talents-profile/PortalAccessBadge";
import { formatRelativeTimeFr } from "@/lib/rh-request-display";
import type { TalentProfile } from "@/types/rh-talents-profile.types";
import { cx } from "@/utils/cx";

const SENIORITY_COLORS: Record<string, string> = {
    Junior: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    Mid: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
    Senior: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    Lead: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    Expert: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
    Stagiaire: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    Freelance: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
};

type TalentProfileCardProps = {
    talent: TalentProfile;
    onViewDetail: (t: TalentProfile) => void;
    onToggle: (t: TalentProfile) => void;
    onDelete: (t: TalentProfile) => void;
};

function initials(name: string): string {
    return name
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

export function TalentProfileCard({ talent, onViewDetail, onToggle, onDelete }: TalentProfileCardProps) {
    const sevKey = talent.seniority_level ?? "";
    const sevCls = SENIORITY_COLORS[sevKey] ?? SENIORITY_COLORS[sevKey.charAt(0).toUpperCase() + sevKey.slice(1).toLowerCase()];

    return (
        <article
            data-testid="talent-card"
            className={cx(
                "group relative overflow-hidden rounded-md border border-ws-border-subtle bg-ws-card p-3 transition hover:border-ws-border hover:shadow-sm",
                talent.status === "inactive" && "opacity-65",
            )}
        >
            <div
                className={cx(
                    "absolute top-0 bottom-0 left-0 w-1",
                    talent.status === "active" ? "bg-emerald-500" : "bg-slate-400",
                )}
            />

            <div className="flex items-start gap-3 pl-3">
                <Avatar size="md" initials={initials(talent.name)} alt={talent.name} />

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <PortalAccessBadge hasAccess={talent.has_portal_access} />
                        {talent.seniority_level ? (
                            <span className={cx("inline-flex rounded-md px-1.5 py-0.5 font-medium", sevCls ?? "bg-ws-muted-surface text-ws-secondary")}>
                                {talent.seniority_level}
                            </span>
                        ) : null}
                        <span
                            className={cx(
                                "inline-flex rounded-md border px-1.5 py-0.5 font-medium",
                                talent.status === "active"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
                            )}
                        >
                            {talent.status === "active" ? "● Actif" : "○ Inactif"}
                        </span>
                    </div>

                    <h3 className="mt-1 truncate text-sm font-medium text-ws-primary">{talent.name}</h3>
                    <p className="truncate text-xs text-ws-secondary">
                        {talent.job_title}
                        {talent.department ? ` · ${talent.department}` : ""}
                    </p>
                    <p className="mt-1 truncate text-xs text-ws-muted">
                        {talent.email}
                        {" · "}
                        {talent.has_manager ? `Manager: ${talent.manager_name}` : "Sans manager"}
                        {" · "}
                        créé {formatRelativeTimeFr(talent.created_at)}
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <Button color="tertiary" size="sm" onPress={() => onViewDetail(talent)}>
                        <Eye className="mr-1 size-3.5" aria-hidden />
                        Voir
                    </Button>
                    <Button
                        color="tertiary"
                        size="sm"
                        data-icon-only
                        aria-label={talent.status === "active" ? "Désactiver" : "Réactiver"}
                        onPress={() => onToggle(talent)}
                    >
                        <Power className="size-3.5" aria-hidden />
                    </Button>
                    <Button
                        color="tertiary"
                        size="sm"
                        data-icon-only
                        aria-label="Supprimer"
                        className="text-red-600 hover:text-red-700"
                        onPress={() => onDelete(talent)}
                    >
                        <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                </div>
            </div>
        </article>
    );
}
