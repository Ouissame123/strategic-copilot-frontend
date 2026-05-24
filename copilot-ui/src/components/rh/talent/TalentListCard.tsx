/**
 * Carte talent — liste Employés RH (présentation compacte).
 */
import { Briefcase, Building2, Pencil, Trash2 } from "lucide-react";
import { TalentAvailabilitySummary } from "@/components/rh/talent/TalentAvailabilitySummary";
import type { RhTalentAvailabilitySummary } from "@/types/rh-availability.types";
import type { RhTalentListItem } from "@/types/rh-talents.types";
import {
    RH_AVATAR,
    RH_CARD,
    RH_SKILL_BADGE,
    RH_STATUS_ACTIVE,
    RH_STATUS_INACTIVE,
    RH_STATUS_ON_LEAVE,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

const STATUS_META: Record<string, { label: string; cls: string }> = {
    active: { label: "Actif", cls: RH_STATUS_ACTIVE },
    inactive: { label: "Inactif", cls: RH_STATUS_INACTIVE },
    onleave: { label: "En congé", cls: RH_STATUS_ON_LEAVE },
};

function skillLevelStars(n: number): string {
    const full = Math.round(Math.max(0, Math.min(5, n)));
    return "★".repeat(full) + "☆".repeat(5 - full);
}

function initials(name: string): string {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("");
}

export type TalentListCardProps = {
    talent: RhTalentListItem;
    availability?: RhTalentAvailabilitySummary | null;
    availabilityLoading?: boolean;
    onOpen: () => void;
    onEdit: () => void;
    onDelete: () => void;
};

export function TalentListCard({
    talent: t,
    availability,
    availabilityLoading,
    onOpen,
    onEdit,
    onDelete,
}: TalentListCardProps) {
    const sm = STATUS_META[t.status] ?? { label: t.status, cls: RH_STATUS_INACTIVE };

    return (
        <article className={cx("group relative flex h-full flex-col overflow-hidden transition hover:shadow-md", RH_CARD)}>
            <div className="absolute right-1.5 top-1.5 z-10 flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                <button
                    type="button"
                    title="Modifier le talent"
                    aria-label={`Modifier ${t.name}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="rounded-md p-1 text-slate-400 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-200"
                >
                    <Pencil size={14} aria-hidden />
                </button>
                <button
                    type="button"
                    title="Désactiver le talent"
                    aria-label={`Désactiver ${t.name}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                >
                    <Trash2 size={14} aria-hidden />
                </button>
            </div>

            <button type="button" onClick={onOpen} className="flex min-h-[168px] flex-1 flex-col p-3 pr-12 text-left">
                <div className="flex items-start gap-2.5">
                    <div
                        className={cx(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            RH_AVATAR,
                        )}
                    >
                        {initials(t.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className={cx("truncate text-sm font-semibold leading-tight", RH_TEXT_PRIMARY)}>{t.name}</span>
                            <span className={cx("shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide", sm.cls)}>
                                {sm.label}
                            </span>
                        </div>
                        <p className={cx("mt-0.5 flex items-center gap-1 truncate text-[11px] leading-snug", RH_TEXT_MUTED)}>
                            <Briefcase size={10} className="shrink-0 opacity-70" aria-hidden />
                            <span className="truncate">{t.job_title || "—"}</span>
                            {t.department ? (
                                <>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <Building2 size={10} className="shrink-0 opacity-70" aria-hidden />
                                    <span className="truncate">{t.department}</span>
                                </>
                            ) : null}
                        </p>
                    </div>
                </div>

                <div className="mt-2.5 flex-1 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                    <TalentAvailabilitySummary
                        compact
                        availability={availability}
                        fallbackLoadPct={t.current_load_pct}
                        fallbackAvailablePct={t.available_pct}
                        fallbackProjectsCount={t.active_projects_count}
                    />
                    {availabilityLoading && !availability ? (
                        <p className={cx("mt-1 text-[10px]", RH_TEXT_MUTED)}>Calcul disponibilité…</p>
                    ) : null}
                </div>

                {t.top_skills?.length > 0 ? (
                    <div className="mt-2 flex min-h-[22px] flex-wrap gap-1">
                        {t.top_skills.slice(0, 4).map((s, i) => (
                            <span
                                key={i}
                                className={cx(
                                    RH_SKILL_BADGE,
                                    "inline-flex max-w-full items-center gap-1 truncate py-px text-[9px]",
                                )}
                                title={`${s.name} · ${s.level}/5`}
                            >
                                <span className="truncate">{s.name}</span>
                                <span className="shrink-0 text-amber-500/90" aria-hidden>
                                    {skillLevelStars(s.level)}
                                </span>
                            </span>
                        ))}
                        {t.top_skills.length > 4 ? (
                            <span className={cx("self-center text-[9px] font-medium", RH_TEXT_MUTED)}>
                                +{t.top_skills.length - 4}
                            </span>
                        ) : null}
                    </div>
                ) : null}
            </button>
        </article>
    );
}
