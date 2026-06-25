import { useEffect, useState } from "react";
import { GraduationCap, RefreshCw, UserPlus, X } from "lucide-react";
import { Link } from "react-router";
import { TalentOpportunitiesApiError } from "@/api/talent-opportunities.api";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import { ErrorState } from "@/components/ui/ErrorState";
import { useExpressInterest, useTalentOpportunityDetail } from "@/hooks/useTalentOpportunities";
import type { OpportunityListItem } from "@/types/talent-opportunities";
import { formatViabilityScoreDisplay } from "@/utils/format";
import { cx } from "@/utils/cx";
import {
    PRIORITY_TONES,
    RECO_TONES,
    SCORE_TIER_TONES,
    SKILL_STATUS_LABELS,
    SKILL_STATUS_TONES,
    badgeToneClass,
    formatIsoDate,
    formatOpportunityScore,
} from "./talent-opportunities-ui";

type OpportunityDetailDrawerProps = {
    open: boolean;
    projectId: string | null;
    listRow?: OpportunityListItem | null;
    onClose: () => void;
};

function actionIcon(actionType: string) {
    const key = actionType.toLowerCase();
    if (key.includes("training") || key.includes("formation")) return GraduationCap;
    if (key.includes("recruit")) return UserPlus;
    return RefreshCw;
}

function ScoreMiniCard({ label, score }: { label: string; score: number }) {
    const f = formatViabilityScoreDisplay(score);
    const barPct = f.barPct ?? 0;
    return (
        <div className="rounded-xl border border-secondary/80 bg-secondary_subtle/30 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-primary">
                {f.value === "—" ? "—" : `${f.value}${f.unit}`}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-quaternary">
                <div
                    className="h-full rounded-full bg-brand-solid transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, barPct))}%` }}
                />
            </div>
        </div>
    );
}

function LevelBar({ label, level, toneClass }: { label: string; level: number; toneClass: string }) {
    const pct = Math.min(100, Math.max(0, level * 10));
    return (
        <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-tertiary">
                <span>{label}</span>
                <span className="tabular-nums">{level}/10</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-quaternary">
                <div className={cx("h-full rounded-full transition-all", toneClass)} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export function OpportunityDetailDrawer({ open, projectId, listRow, onClose }: OpportunityDetailDrawerProps) {
    const detailQuery = useTalentOpportunityDetail(open && projectId ? projectId : null);
    const expressMutation = useExpressInterest();
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!open) setMessage("");
    }, [open, projectId]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open || !projectId) return null;

    const detail = detailQuery.data;
    const opportunity = detail?.opportunity;
    const is404 = detailQuery.error instanceof TalentOpportunitiesApiError && detailQuery.error.httpStatus === 404;

    const headerName = opportunity?.project_name ?? listRow?.project_name ?? "Projet";
    const scoreTier = opportunity?.score_tier ?? listRow?.score_tier;
    const scoreLabel = opportunity?.score_label ?? listRow?.score_label;
    const overallScore = opportunity?.overall_score ?? listRow?.overall_score;
    const recoType = opportunity?.recommendation_type ?? listRow?.recommendation_type;
    const recoLabel = opportunity?.recommendation_label ?? listRow?.recommendation_label;

    const canExpress =
        opportunity?.can_express_interest ??
        (listRow ? !listRow.already_interested : false);
    const alreadyInterested = opportunity?.already_interested ?? listRow?.already_interested ?? false;

    const handleExpress = () => {
        expressMutation.mutate(
            { project_id: projectId, message: message.trim() || undefined },
            { onSuccess: () => setMessage("") },
        );
    };

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-overlay/60 backdrop-blur-[2px]"
                aria-label="Fermer"
                onClick={onClose}
            />
            <aside
                className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[560px] flex-col border-l border-secondary bg-primary shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="talent-opportunity-drawer-title"
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-secondary px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            {scoreTier && scoreLabel && overallScore != null ? (
                                <span className={badgeToneClass(SCORE_TIER_TONES[scoreTier])}>
                                    {scoreLabel} · {formatOpportunityScore(overallScore)}
                                </span>
                            ) : null}
                            {recoType && recoLabel ? (
                                <span className={badgeToneClass(RECO_TONES[recoType])}>{recoLabel}</span>
                            ) : null}
                        </div>
                        <h2 id="talent-opportunity-drawer-title" className="line-clamp-2 text-base font-semibold text-primary">
                            {headerName}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-2 text-tertiary transition hover:bg-secondary_subtle hover:text-primary"
                        aria-label="Fermer"
                    >
                        <X className="size-5" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    {detailQuery.isLoading && !detail ? (
                        <div className="space-y-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-14 animate-pulse rounded-lg bg-secondary" />
                            ))}
                        </div>
                    ) : null}

                    {detailQuery.isError && !detail ? (
                        <ErrorState
                            title={is404 ? "Opportunité introuvable" : "Détail indisponible"}
                            message={
                                is404
                                    ? "Cette opportunité n'est plus disponible."
                                    : "Impossible de charger le détail de cette opportunité."
                            }
                            detail={
                                !is404 && detailQuery.error instanceof Error ? detailQuery.error.message : undefined
                            }
                            onRetry={is404 ? undefined : () => void detailQuery.refetch()}
                        />
                    ) : null}

                    {detail && opportunity ? (
                        <div className="space-y-8">
                            <section>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Score breakdown</h3>
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    <ScoreMiniCard label="Global" score={opportunity.overall_score} />
                                    <ScoreMiniCard label="Skill fit" score={opportunity.skill_fit_score} />
                                    <ScoreMiniCard label="Disponibilité" score={opportunity.availability_score} />
                                </div>
                            </section>

                            {opportunity.match_summary ? (
                                <section>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                                        Analyse Matchmaker
                                    </h3>
                                    <p className="mt-2 text-sm text-secondary">{opportunity.match_summary}</p>
                                </section>
                            ) : null}

                            <section>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                                    Mon analyse compétences
                                </h3>
                                {detail.skill_details.length === 0 ? (
                                    <p className="mt-2 text-sm text-tertiary">Aucune compétence analysée.</p>
                                ) : (
                                    <ul className="mt-3 space-y-4">
                                        {detail.skill_details.map((skill) => {
                                            const statusTone = SKILL_STATUS_TONES[skill.status] ?? "slate";
                                            return (
                                                <li
                                                    key={skill.skill_id}
                                                    className="rounded-xl border border-secondary/80 bg-primary p-3"
                                                >
                                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                                        <div>
                                                            <p className="text-sm font-semibold text-primary">{skill.skill_name}</p>
                                                            {skill.category ? (
                                                                <p className="text-xs text-tertiary">{skill.category}</p>
                                                            ) : null}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            <span className={badgeToneClass(statusTone)}>
                                                                {SKILL_STATUS_LABELS[skill.status] ?? skill.status}
                                                            </span>
                                                            {skill.is_critical ? (
                                                                <span className={badgeToneClass("red")}>Critique</span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 space-y-2">
                                                        <LevelBar label="Requis" level={skill.required_level} toneClass="bg-amber-500" />
                                                        <LevelBar label="Mon niveau" level={skill.available_level} toneClass="bg-brand-solid" />
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>

                            <section>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                                    Recommandations IA
                                </h3>
                                {detail.recommended_actions.length === 0 ? (
                                    <p className="mt-2 text-sm text-tertiary">Aucune recommandation.</p>
                                ) : (
                                    <ul className="mt-3 space-y-3">
                                        {detail.recommended_actions.map((action, index) => {
                                            const Icon = actionIcon(action.action_type);
                                            const priorityTone = PRIORITY_TONES[action.priority_level] ?? "slate";
                                            return (
                                                <li
                                                    key={`${action.action_type}-${index}`}
                                                    className="flex gap-3 rounded-xl border border-secondary/80 bg-secondary_subtle/20 p-3"
                                                >
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary ring-1 ring-secondary">
                                                        <Icon className="size-4 text-tertiary" aria-hidden />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-sm font-semibold text-primary">
                                                                {action.action_type_label}
                                                            </p>
                                                            <span className={badgeToneClass(priorityTone)}>
                                                                {action.priority_label}
                                                            </span>
                                                        </div>
                                                        {action.target_skill_name ? (
                                                            <p className="mt-1 text-xs text-secondary">
                                                                Compétence : {action.target_skill_name}
                                                                {action.proposed_allocation_pct != null
                                                                    ? ` · ${action.proposed_allocation_pct}% allocation`
                                                                    : null}
                                                            </p>
                                                        ) : null}
                                                        {action.action_summary ? (
                                                            <p className="mt-1 text-sm text-tertiary">{action.action_summary}</p>
                                                        ) : null}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>
                        </div>
                    ) : null}
                </div>

                {(detail?.my_interest || canExpress || alreadyInterested) && (
                    <footer className="shrink-0 border-t border-secondary px-4 py-4">
                        {detail?.my_interest ? (
                            <div className="space-y-2 text-sm">
                                <p className="font-medium text-primary">
                                    Demande envoyée le {formatIsoDate(detail.my_interest.created_at) ?? "—"}
                                </p>
                                <p className="text-secondary">
                                    Statut : {detail.my_interest.status_label}
                                </p>
                                <Link
                                    to="/workspace/talent/requests"
                                    className="inline-block text-sm font-medium text-brand-secondary hover:underline"
                                >
                                    Voir mes demandes
                                </Link>
                            </div>
                        ) : canExpress && !alreadyInterested ? (
                            <div className="space-y-3">
                                <TextArea
                                    label="Message (optionnel)"
                                    placeholder="Ex. Très intéressé(e) par ce projet…"
                                    value={message}
                                    onChange={setMessage}
                                    isDisabled={expressMutation.isPending}
                                    rows={3}
                                />
                                <Button
                                    type="button"
                                    color="primary"
                                    className="w-full"
                                    isLoading={expressMutation.isPending}
                                    isDisabled={expressMutation.isPending}
                                    onClick={handleExpress}
                                >
                                    Je suis intéressé(e)
                                </Button>
                            </div>
                        ) : alreadyInterested ? (
                            <div className="space-y-2 text-sm">
                                <p className="font-medium text-emerald-700 dark:text-emerald-300">Intérêt déjà envoyé</p>
                                <Link
                                    to="/workspace/talent/requests"
                                    className="inline-block font-medium text-brand-secondary hover:underline"
                                >
                                    Voir mes demandes
                                </Link>
                            </div>
                        ) : null}
                    </footer>
                )}
            </aside>
        </>
    );
}
