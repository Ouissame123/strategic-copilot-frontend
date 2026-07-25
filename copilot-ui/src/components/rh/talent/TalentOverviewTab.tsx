/**
 * Onglet Vue d’ensemble — fiche talent RH premium (vue d'ensemble type enterprise).
 */
import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ChevronRight,
    Clock,
    History,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Sparkles,
    Target,
    Zap,
} from "lucide-react";
import { TalentAvailabilitySection } from "@/components/rh/talent/TalentAvailabilitySection";
import { useTalentEmployment } from "@/hooks/useTalentEmployment";
import { formatAvailabilityPct, hasAvailabilityPct } from "@/lib/rh-availability-display";
import { contractExpiryMeta, overviewContractKpi } from "@/lib/rh-employment-display";
import { stars } from "@/lib/rh-talent-skills-display";
import type { RhTalentAvailabilitySummary } from "@/types/rh-availability.types";
import type {
    RhTalentAssignment,
    RhTalentDetail,
    RhTalentDetailSkill,
    RhTalentListItem,
} from "@/types/rh-talents.types";
import {
    RH_AVATAR,
    RH_BTN_PRIMARY,
    RH_BTN_SECONDARY,
    RH_CARD,
    RH_STATUS_ACTIVE,
    RH_STATUS_INACTIVE,
    RH_STATUS_ON_LEAVE,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    RH_TEXT_SECONDARY,
    WS_MUTED_SURFACE,
    WS_SUBTLE,
    WS_TEXT_FAINT,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

const STATUS_META: Record<string, { label: string; cls: string }> = {
    active: { label: "Actif", cls: RH_STATUS_ACTIVE },
    inactive: { label: "Inactif", cls: RH_STATUS_INACTIVE },
    onleave: { label: "En congé", cls: RH_STATUS_ON_LEAVE },
};

export type TalentOverviewTabProps = {
    talentId: string;
    detail: RhTalentDetail;
    listPreview?: RhTalentListItem | null;
    availabilityPreview?: RhTalentAvailabilitySummary | null;
    apiBase?: string;
    token?: string;
    onEdit?: () => void;
    onOpenProject?: (projectId: string) => void;
    onGoToTab?: (tab: "skills" | "employment") => void;
};

function fmtDate(d?: string | null): string {
    if (!d) return "—";
    const t = new Date(d);
    return Number.isNaN(t.getTime())
        ? "—"
        : t.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name: string): string {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("");
}

function sumAllocation(assignments: RhTalentAssignment[]): number {
    return assignments.reduce((s, a) => s + (a.allocation_pct ?? 0), 0);
}

function loadBarTone(pct: number): string {
    if (pct >= 100) return "bg-rose-500";
    if (pct >= 80) return "bg-amber-400";
    if (pct > 0) return "bg-emerald-500";
    return "bg-slate-300 dark:bg-slate-600";
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <h3 className={cx("mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider", RH_TEXT_MUTED)}>
            {icon}
            {children}
        </h3>
    );
}

function KpiCard({
    label,
    value,
    sub,
    tone = "neutral",
}: {
    label: string;
    value: string;
    sub?: string;
    tone?: "neutral" | "danger" | "success" | "warn";
}) {
    const valueCls =
        tone === "danger"
            ? "text-rose-600 dark:text-rose-400"
            : tone === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : tone === "warn"
                ? "text-amber-600 dark:text-amber-400"
                : RH_TEXT_PRIMARY;
    return (
        <div className={cx(RH_CARD, "p-3")}>
            <div className={cx("text-[10px] font-semibold uppercase tracking-wide", WS_TEXT_FAINT)}>{label}</div>
            <div className={cx("mt-1 text-lg font-bold tabular-nums leading-tight", valueCls)}>{value}</div>
            {sub ? <div className={cx("mt-0.5 text-[10px]", RH_TEXT_MUTED)}>{sub}</div> : null}
        </div>
    );
}

function ProgressBar({ pct, className }: { pct: number; className?: string }) {
    const w = Math.min(100, Math.max(0, pct));
    return (
        <div className={cx("h-2 overflow-hidden rounded-full", WS_MUTED_SURFACE, className)}>
            <div className={cx("h-full rounded-full transition-all", loadBarTone(w))} style={{ width: `${w}%` }} />
        </div>
    );
}

/** Libellé humain pour recommendation_type (ex. redeploy). */
function formatRhRecommendationType(raw?: string | null): string | null {
    if (!raw?.trim()) return null;
    const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const labels: Record<string, string> = {
        redeploy: "Recommandation : réaffectation possible vers ce projet.",
        re_deploy: "Recommandation : réaffectation possible vers ce projet.",
        reassignment: "Recommandation : réaffectation possible vers ce projet.",
        reassign: "Recommandation : réaffectation possible vers ce projet.",
        assign: "Recommandation : affectation conseillée sur ce projet.",
        strengthen: "Recommandation : renforcer l'équipe sur ce projet.",
        maintain: "Recommandation : maintenir l'affectation actuelle.",
        keep: "Recommandation : maintenir l'affectation actuelle.",
    };
    if (labels[key]) return labels[key];
    if (key.includes("redeploy") || key.includes("reassign")) {
        return "Recommandation : réaffectation possible vers ce projet.";
    }
    const human = raw.replace(/_/g, " ").trim();
    return human ? `Recommandation : ${human.charAt(0).toLowerCase()}${human.slice(1)}.` : null;
}

function formatMobilityCompact(flag?: string | null, score?: number | null): string {
    if (!flag?.trim()) return "—";
    const key = flag.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const labels: Record<string, string> = {
        at_risk: "À risque",
        stable: "Stable",
        low: "Faible",
        medium: "Modérée",
        high: "Élevée",
        moderate: "Modérée",
    };
    const label = labels[key] ?? flag.replace(/_/g, " ");
    return score != null ? `${label} · ${Math.round(score)}` : label;
}

function TalentAiRecommendationCard({
    detail,
    overload,
}: {
    detail: RhTalentDetail;
    overload: boolean;
}) {
    const match = detail.best_match;
    const score =
        match?.overall_score != null && !Number.isNaN(Number(match.overall_score))
            ? Number(match.overall_score).toFixed(1)
            : null;
    const statusLabel = formatRhRecommendationType(match?.recommendation_type);
    const summary =
        detail.analyst?.recommendation?.trim() ||
        detail.analyst?.nine_box?.rationale?.trim() ||
        (overload
            ? "Talent performant mais surcharge critique — rééquilibrer les affectations."
            : match?.project_name
              ? `Profil aligné pour ${match.project_name}.`
              : null);

    const ipiScore = detail.analyst?.ipi?.ipi_score;
    const stability = detail.analyst?.ipi?.stability_score;
    const mobilityFlag = detail.analyst?.mobility?.mobility_flag;
    const mobilityScore = detail.analyst?.mobility?.mobility_score;

    return (
        <section
            className={cx(
                RH_CARD,
                "overflow-hidden border-primary-200/90 bg-gradient-to-br from-primary-50/90 via-white to-primary-50/50 p-4 shadow-sm dark:border-primary-800/80 dark:from-primary-950/50 dark:via-slate-900 dark:to-primary-950/40",
            )}
        >
            <div className="mb-4 flex items-center gap-2.5">
                <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 shadow-sm dark:bg-primary-900/60 dark:text-primary-300"
                    aria-hidden
                >
                    <Sparkles size={16} />
                </div>
                <div>
                    <h3 className={cx("text-sm font-bold tracking-tight", RH_TEXT_PRIMARY)}>Recommandation IA</h3>
                    <p className={cx("text-[11px]", RH_TEXT_MUTED)}>Analyse Copilote Stratégique</p>
                </div>
            </div>

            {match?.project_name ? (
                <div
                    className={cx(
                        "rounded-xl border border-primary-200/80 bg-white/90 p-3.5 shadow-sm dark:border-primary-800/70 dark:bg-primary-950/25",
                    )}
                >
                    <p className={cx("text-[10px] font-semibold uppercase tracking-wider", WS_TEXT_FAINT)}>
                        Projet recommandé
                    </p>
                    <div className="mt-1.5 flex items-start justify-between gap-3">
                        <p className={cx("min-w-0 flex-1 text-base font-bold leading-snug", RH_TEXT_PRIMARY)}>
                            {match.project_name}
                        </p>
                        {score ? (
                            <div className="shrink-0 text-right">
                                <span className="text-2xl font-bold tabular-nums leading-none text-primary-700 dark:text-primary-300">
                                    {score}
                                </span>
                                <span className="text-sm font-semibold text-primary-500 dark:text-primary-400">/10</span>
                            </div>
                        ) : null}
                    </div>
                    {statusLabel ? (
                        <p
                            className={cx(
                                "mt-2.5 rounded-lg border border-primary-100 bg-primary-50/80 px-2.5 py-1.5 text-xs font-medium leading-snug text-primary-900 dark:border-primary-800/60 dark:bg-primary-900/30 dark:text-primary-100",
                            )}
                        >
                            {statusLabel}
                        </p>
                    ) : null}
                </div>
            ) : (
                <p className={cx("rounded-lg border border-dashed border-primary-200/70 px-3 py-2.5 text-xs", RH_TEXT_MUTED)}>
                    Aucun projet recommandé par l&apos;analyse pour le moment.
                </p>
            )}

            {summary ? (
                <p className={cx("mt-3 text-sm leading-relaxed", RH_TEXT_SECONDARY)}>{summary}</p>
            ) : null}

            <div
                className={cx(
                    "mt-4 grid grid-cols-3 divide-x divide-primary-200/70 overflow-hidden rounded-lg border border-primary-200/60 bg-white/60 dark:divide-primary-800/60 dark:border-primary-800/50 dark:bg-primary-950/20",
                )}
            >
                <div className="px-2 py-2.5 text-center sm:px-3">
                    <div className={cx("text-[10px] font-semibold uppercase tracking-wide", WS_TEXT_FAINT)}>IPI</div>
                    <div className="mt-0.5 text-base font-bold tabular-nums text-primary-700 dark:text-primary-300">
                        {ipiScore != null ? Number(ipiScore).toFixed(1) : "—"}
                    </div>
                </div>
                <div className="px-2 py-2.5 text-center sm:px-3">
                    <div className={cx("text-[10px] font-semibold uppercase tracking-wide", WS_TEXT_FAINT)}>Stabilité</div>
                    <div className={cx("mt-0.5 text-base font-bold tabular-nums", RH_TEXT_PRIMARY)}>
                        {stability != null ? `${Math.round(stability)}%` : "—"}
                    </div>
                </div>
                <div className="px-2 py-2.5 text-center sm:px-3">
                    <div className={cx("text-[10px] font-semibold uppercase tracking-wide", WS_TEXT_FAINT)}>Mobilité</div>
                    <div className={cx("mt-0.5 text-xs font-semibold leading-tight", RH_TEXT_PRIMARY)}>
                        {formatMobilityCompact(mobilityFlag, mobilityScore)}
                    </div>
                </div>
            </div>
        </section>
    );
}

export function TalentOverviewTab({
    talentId,
    detail,
    listPreview,
    availabilityPreview,
    apiBase,
    token,
    onEdit,
    onOpenProject,
    onGoToTab,
}: TalentOverviewTabProps) {
    const employmentCtx = useMemo(() => ({ token, apiBase }), [token, apiBase]);
    const { data: employmentResponse } = useTalentEmployment(talentId, employmentCtx);
    const employment = employmentResponse?.employment ?? null;

    const sm = STATUS_META[detail.status] ?? { label: detail.status, cls: RH_STATUS_INACTIVE };
    const location = [detail.profile?.city, detail.profile?.country].filter(Boolean).join(", ") || null;

    const availableRaw = availabilityPreview?.available_pct ?? detail.available_pct;
    const hasAvailability = hasAvailabilityPct(availableRaw);
    const activeLoad = availabilityPreview?.active_load_pct ?? detail.current_load_pct ?? 0;
    const plannedLoad = availabilityPreview?.planned_load_pct ?? 0;
    const availablePct = hasAvailability ? Number(availableRaw) : 0;

    const allocationPct =
        detail.summary?.total_allocation_pct ??
        (detail.active_assignments.length ? sumAllocation(detail.active_assignments) : activeLoad);

    const capacityHours = detail.capacity?.capacity_hours_per_week ?? 40;
    const contractEnd =
        employment?.contract_end_date?.trim() || detail.contract_end_date?.trim() || null;
    const contractExpiry = contractExpiryMeta(contractEnd);
    const contractDays = contractExpiry.days;
    const contractKpi = useMemo(
        () => overviewContractKpi(employment, detail.contract_end_date),
        [employment, detail.contract_end_date],
    );
    const alerts = detail.active_alerts ?? [];
    const alertsCount = detail.summary?.active_alerts_count ?? alerts.length;
    const projectsCount =
        detail.summary?.active_projects_count ??
        availabilityPreview?.active_projects_count ??
        detail.active_assignments.length;

    const overload = Boolean(detail.summary?.overload ?? allocationPct > 100);
    const contractSoon = Boolean(
        detail.summary?.contract_ending_soon ?? contractExpiry.showWarning,
    );
    const mobilityRisk = detail.analyst?.mobility?.mobility_flag === "at_risk";
    const showRiskAlert = overload || contractSoon || alertsCount > 0 || mobilityRisk;

    const topSkills = useMemo(
        () =>
            [...(detail.skills ?? [])]
                .sort((a, b) => b.proficiency_level - a.proficiency_level)
                .slice(0, 8),
        [detail.skills],
    );

    const activityItems = useMemo(() => {
        const items: { date: string; label: string; kind: string }[] = [];
        for (const a of detail.active_assignments) {
            if (a.start_date) {
                items.push({
                    date: a.start_date,
                    label: `Affectation — ${a.project_name ?? "Projet"} (${a.allocation_pct ?? 0}%)`,
                    kind: "assignment",
                });
            }
        }
        for (const al of alerts.slice(0, 3)) {
            if (al.detected_at) {
                items.push({
                    date: al.detected_at,
                    label: al.message ?? "Alerte watchdog",
                    kind: "alert",
                });
            }
        }
        if (detail.best_match?.project_name) {
            items.push({
                date: new Date().toISOString(),
                label: `Analyse IA — matching ${detail.best_match.project_name}`,
                kind: "ai",
            });
        }
        return items
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 6);
    }, [detail, alerts]);

    return (
        <div className="space-y-4 pb-4">
            {/* 1 — Hero */}
            <section
                className={cx(
                    RH_CARD,
                    "overflow-hidden border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-primary-50/30 p-3 dark:from-slate-900 dark:via-slate-900 dark:to-primary-950/20",
                )}
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div
                        className={cx(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold shadow-sm",
                            RH_AVATAR,
                        )}
                    >
                        {initials(detail.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className={cx("text-lg font-bold tracking-tight", RH_TEXT_PRIMARY)}>{detail.name}</h2>
                            <span className={cx("rounded-full px-2 py-px text-[9px] font-semibold uppercase tracking-wide", sm.cls)}>{sm.label}</span>
                        </div>
                        <p className={cx("mt-0.5 text-sm font-medium", RH_TEXT_SECONDARY)}>
                            {detail.job_title ?? listPreview?.job_title ?? "—"}
                            {(detail.department ?? listPreview?.department)
                                ? ` · ${detail.department ?? listPreview?.department}`
                                : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            {detail.email ? (
                                <span className={cx("inline-flex items-center gap-1", RH_TEXT_MUTED)}>
                                    <Mail size={12} aria-hidden />
                                    {detail.email}
                                </span>
                            ) : null}
                            {detail.phone ? (
                                <span className={cx("inline-flex items-center gap-1", RH_TEXT_MUTED)}>
                                    <Phone size={12} aria-hidden />
                                    {detail.phone}
                                </span>
                            ) : null}
                            {location ? (
                                <span className={cx("inline-flex items-center gap-1", RH_TEXT_MUTED)}>
                                    <MapPin size={12} aria-hidden />
                                    {location}
                                </span>
                            ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {onEdit ? (
                                <button type="button" onClick={onEdit} className={cx("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold", RH_BTN_SECONDARY)}>
                                    <Pencil size={13} aria-hidden />
                                    Modifier profil
                                </button>
                            ) : null}
                            {onGoToTab ? (
                                <button
                                    type="button"
                                    onClick={() => onGoToTab("skills")}
                                    className={cx("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold", RH_BTN_PRIMARY)}
                                >
                                    Voir compétences
                                </button>
                            ) : null}
                            {onGoToTab ? (
                                <button
                                    type="button"
                                    onClick={() => onGoToTab("employment")}
                                    className={cx("inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900", RH_TEXT_SECONDARY)}
                                >
                                    Emploi & contrat
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>

            {/* 2 — KPI strip */}
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <KpiCard label="Capacité" value={`${capacityHours}h/sem`} sub="Charge nominale" />
                <KpiCard
                    label="Allocation"
                    value={`${Math.round(allocationPct)}%`}
                    tone={allocationPct > 100 ? "danger" : allocationPct >= 80 ? "warn" : "neutral"}
                />
                <KpiCard
                    label="Disponible"
                    value={hasAvailability ? formatAvailabilityPct(availablePct) : "—"}
                    tone={hasAvailability && availablePct === 0 ? "danger" : hasAvailability && availablePct >= 50 ? "success" : "neutral"}
                />
                <KpiCard
                    label="Contrat"
                    value={contractKpi.value}
                    sub={contractKpi.sub}
                    tone={contractKpi.tone === "neutral" && contractSoon ? "warn" : contractKpi.tone}
                />
            </div>

            {/* 3 — Risk alert */}
            {showRiskAlert ? (
                <div className="rounded-lg border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-100/50 p-3 dark:border-rose-900 dark:from-rose-950/50 dark:to-rose-950/20">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 shrink-0 text-rose-600" size={20} aria-hidden />
                        <div>
                            <p className="text-sm font-bold text-rose-900 dark:text-rose-100">Risque élevé</p>
                            <p className="mt-1 text-xs text-rose-800/90 dark:text-rose-200/90">
                                Allocation {Math.round(allocationPct)}%
                                {alertsCount > 0 ? ` · ${alertsCount} alerte${alertsCount > 1 ? "s" : ""}` : ""}
                                {projectsCount > 0 ? ` · ${projectsCount} projet${projectsCount > 1 ? "s" : ""}` : ""}
                                {contractSoon && contractDays != null ? ` · contrat <${contractDays}j` : contractSoon ? " · contrat <90j" : ""}
                                {mobilityRisk ? " · mobilité à risque" : ""}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* 4 — Disponibilité (ex-onglet) */}
            <section>
                <TalentAvailabilitySection
                    talentId={talentId}
                    apiBase={apiBase}
                    token={token}
                    listSummary={
                        availabilityPreview ??
                        (talentId
                            ? {
                                  talent_id: talentId,
                                  availability_status: null,
                                  active_load_pct: activeLoad,
                                  planned_load_pct: plannedLoad,
                                  available_pct: hasAvailability ? availablePct : detail.available_pct ?? 0,
                                  active_projects_count: projectsCount,
                              }
                            : null)
                    }
                />
            </section>

            {/* 5 — Missions (ex-onglet) */}
            <section id="talent-overview-missions">
                <SectionTitle icon={<Target size={14} className="text-primary-500" aria-hidden />}>
                    Projets actifs ({detail.active_assignments.length})
                </SectionTitle>
                {detail.active_assignments.length === 0 ? (
                    <p className={cx("rounded-lg border border-dashed px-4 py-6 text-center text-xs", RH_TEXT_MUTED)}>
                        Aucun projet actif
                    </p>
                ) : (
                    <div className="space-y-2">
                        {detail.active_assignments.map((a, i) => (
                            <button
                                key={a.id ?? i}
                                type="button"
                                onClick={() => a.project_id && onOpenProject?.(a.project_id)}
                                className={cx(
                                    RH_CARD,
                                    "flex w-full flex-col gap-2 p-3 text-left transition hover:border-ws-accent/40 hover:shadow-sm sm:flex-row sm:items-center",
                                )}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={cx("text-sm font-semibold", RH_TEXT_PRIMARY)}>
                                            {a.project_name ?? "Projet"}
                                        </span>
                                        {a.project_priority != null && a.project_priority <= 3 ? (
                                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
                                                P{a.project_priority}
                                            </span>
                                        ) : null}
                                        {a.criticality ? (
                                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                                                {a.criticality}
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className={cx("mt-0.5 text-[11px]", RH_TEXT_MUTED)}>
                                        {a.role_on_project ?? "—"} · {a.status ?? "en cours"} · fin {fmtDate(a.end_date)}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-3 sm:w-28">
                                    <div className="min-w-0 flex-1">
                                        <div className={cx("mb-1 text-right text-xs font-bold tabular-nums", RH_TEXT_PRIMARY)}>
                                            {a.allocation_pct ?? 0}%
                                        </div>
                                        <ProgressBar pct={a.allocation_pct ?? 0} />
                                    </div>
                                    {a.project_id && onOpenProject ? (
                                        <ChevronRight size={16} className={WS_TEXT_FAINT} aria-hidden />
                                    ) : null}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                {detail.past_assignments.length > 0 ? (
                    <div className="mt-3">
                        <SectionTitle icon={<History size={14} className={WS_TEXT_FAINT} aria-hidden />}>
                            Historique missions ({detail.past_assignments.length})
                        </SectionTitle>
                        <div className={cx(RH_CARD, "divide-y divide-slate-100 p-2 dark:divide-slate-800")}>
                            {detail.past_assignments.map((a, i) => (
                                <div
                                    key={a.id ?? i}
                                    className={cx("flex justify-between gap-2 py-2 text-xs first:pt-1 last:pb-1", RH_TEXT_MUTED)}
                                >
                                    <span className="truncate font-medium">{a.project_name || "Projet"}</span>
                                    <span className="shrink-0 text-ws-faint">{fmtDate(a.end_date)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </section>

            {/* 6 — Top skills (aperçu) */}
            <section>
                <SectionTitle icon={<Zap size={14} className="text-amber-500" aria-hidden />}>
                    Top compétences
                </SectionTitle>
                {topSkills.length === 0 ? (
                    <p className={cx("text-xs", RH_TEXT_MUTED)}>
                        Aucune compétence —{" "}
                        <button type="button" onClick={() => onGoToTab?.("skills")} className="text-ws-accent hover:underline">
                            Ajouter
                        </button>
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {topSkills.map((s, i) => (
                            <SkillTag key={s.id ?? i} skill={s} />
                        ))}
                    </div>
                )}
            </section>

            {/* 7 — Recommandation IA (ex-onglet IA Insights) */}
            <TalentAiRecommendationCard detail={detail} overload={overload} />

            {/* 8 — Activité récente */}
            <section className={cx(RH_CARD, "p-4")}>
                <SectionTitle icon={<Clock size={14} aria-hidden />}>Activité récente</SectionTitle>
                {activityItems.length === 0 ? (
                    <p className={cx("text-sm", RH_TEXT_MUTED)}>Aucune activité récente enregistrée.</p>
                ) : (
                    <ul className="relative mt-1 space-y-0 border-l-2 border-slate-200 pl-5 dark:border-slate-700">
                        {activityItems.map((item, i) => (
                            <li key={i} className="relative pb-5 last:pb-0">
                                <span className="absolute -left-[23px] top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary-500 dark:border-slate-900" />
                                <p className={cx("text-[11px] font-semibold uppercase tracking-wide", WS_TEXT_FAINT)}>
                                    {fmtDate(item.date)}
                                </p>
                                <p className={cx("mt-1 text-sm leading-snug", RH_TEXT_SECONDARY)}>{item.label}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {detail.bio ? (
                <p className={cx("rounded-lg p-3 text-xs leading-relaxed", WS_SUBTLE, RH_TEXT_SECONDARY)}>{detail.bio}</p>
            ) : null}
        </div>
    );
}

function SkillTag({ skill }: { skill: RhTalentDetailSkill }) {
    return (
        <span
            className={cx(
                "inline-flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900",
            )}
        >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                {skill.skill_name}
                <span className="text-amber-500">{stars(skill.proficiency_level)}</span>
            </span>
            <span className={cx("text-[10px]", RH_TEXT_MUTED)}>
                {skill.skill_category ?? "Général"}
                {skill.years_experience != null ? ` · ${skill.years_experience} an${skill.years_experience > 1 ? "s" : ""}` : ""}
            </span>
        </span>
    );
}
