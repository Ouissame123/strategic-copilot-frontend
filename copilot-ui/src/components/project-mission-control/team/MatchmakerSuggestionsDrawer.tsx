import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/providers/toast-provider";
import { Loader2, MoreVertical, RefreshCcw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useMatchmakerQuery } from "@/hooks/useMatchmakerQuery";
import { useOrchestratorRecompute } from "@/hooks/useOrchestratorRecompute";
import { formatMatchmakerScore10 } from "@/lib/manager-dashboard-display";
import type { ManagerProjectTalentMatchingAction, ManagerProjectTalentMatchingTalent } from "@/types/manager-matchmaker.types";
import type { WmpAssignmentType } from "@/types/api.types";
import { cx } from "@/utils/cx";
import { assignmentTypeLabelKey, matchmakerSuggestionKey } from "./matchmaker-suggestion-utils";

export type MatchmakerAssignOptions = {
    allocation_pct?: number;
    assignment_type?: WmpAssignmentType;
};

type MatchmakerSuggestionsDrawerProps = {
    open: boolean;
    projectId: string;
    projectName: string;
    activeAssignedTalentIds?: Set<string>;
    assigningKey?: string | null;
    hiddenAssignedKeys?: Set<string>;
    assignedCount?: number;
    onClose: () => void;
    onManualAssign: () => void;
    onQuickAssign: (suggestion: ManagerProjectTalentMatchingTalent, options?: MatchmakerAssignOptions) => void;
    onCustomizeAssign: (suggestion: ManagerProjectTalentMatchingTalent) => void;
    onViewProfile: (talentId: string) => void;
    resolveTalentId: (suggestion: ManagerProjectTalentMatchingTalent) => string | null;
};

function normalizeTalentId(id: string | null | undefined): string {
    return String(id ?? "").trim().toLowerCase();
}

function computeProposedAllocationPct(currentAllocationPct?: number | null): number {
    const available = Math.max(0, 100 - Math.round(currentAllocationPct ?? 0));
    return Math.min(50, available);
}

function isTalentSaturated(talent: ManagerProjectTalentMatchingTalent): boolean {
    const proposedAlloc = computeProposedAllocationPct(talent.current_allocation_pct);
    return (
        talent.requires_redeployment === true ||
        (talent.current_allocation_pct ?? 0) >= 100 ||
        proposedAlloc === 0
    );
}

function ActionBadge({ action }: { action: ManagerProjectTalentMatchingAction }) {
    const type = action.action_type.toLowerCase();
    const tone =
        type === "recruitment" ? "bg-rose-100 text-rose-800" : type === "training" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800";
    const label = type === "recruitment" ? "Recrutement" : type === "training" ? "Formation" : "Réaffectation";
    return (
        <span className={cx("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", tone)}>{label}</span>
    );
}

type SuggestionCardProps = {
    talent: ManagerProjectTalentMatchingTalent;
    assigningKey: string | null;
    tm: (key: string, opts?: Record<string, string | number>) => string;
    resolveTalentId: (suggestion: ManagerProjectTalentMatchingTalent) => string | null;
    onQuickAssign: MatchmakerSuggestionsDrawerProps["onQuickAssign"];
    onCustomizeAssign: MatchmakerSuggestionsDrawerProps["onCustomizeAssign"];
    onViewProfile: MatchmakerSuggestionsDrawerProps["onViewProfile"];
    onDismiss: (key: string) => void;
    onRedeployHint: () => void;
};

function MatchmakerSuggestionCard({
    talent,
    assigningKey,
    tm,
    resolveTalentId,
    onQuickAssign,
    onCustomizeAssign,
    onViewProfile,
    onDismiss,
    onRedeployHint,
}: SuggestionCardProps) {
    const key = matchmakerSuggestionKey(talent);
    const talentId = resolveTalentId(talent);
    const isAssigning = assigningKey === key;
    const proposedAlloc = useMemo(() => computeProposedAllocationPct(talent.current_allocation_pct), [talent.current_allocation_pct]);
    const saturated = isTalentSaturated(talent);
    const allocPct = talent.current_allocation_pct ?? 0;
    const availabilityLabel = talent.requires_redeployment
        ? `Saturé à ${Math.round(allocPct)}%`
        : `Disponible à ${Math.max(0, 100 - Math.round(allocPct))}%`;

    const assignAria = tm("matchmakerAssignAria", {
        name: talent.talent_name,
        allocation: proposedAlloc,
        type: tm("assignTypePartTime"),
    });

    const assignButton = (
        <Button
            type="button"
            color="primary"
            size="sm"
            isLoading={isAssigning}
            isDisabled={saturated || !talentId || Boolean(assigningKey && assigningKey !== key)}
            aria-label={assignAria}
            title={saturated ? "Talent saturé — libérez de la capacité avant affectation" : undefined}
            onClick={() => onQuickAssign(talent, { allocation_pct: proposedAlloc })}
        >
            {saturated ? "Saturé" : `Affecter (${proposedAlloc}%)`}
        </Button>
    );

    return (
        <li className="rounded-xl border border-secondary bg-primary p-4 shadow-xs">
            <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary_subtle text-sm font-bold text-fg-primary">
                    {talent.talent_name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-fg-primary">{talent.talent_name}</p>
                        <span
                            className={cx(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                talent.requires_redeployment ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800",
                            )}
                        >
                            {availabilityLabel}
                        </span>
                    </div>
                    {talent.overall_score != null ? (
                        <p className="mt-0.5 text-xs text-fg-secondary">
                            Score adéquation : <strong>{formatMatchmakerScore10(talent.overall_score)}</strong>
                            {talent.skill_fit_score != null ? (
                                <>
                                    {" · "}
                                    Fit compétences : <strong>{formatMatchmakerScore10(talent.skill_fit_score)}</strong>
                                </>
                            ) : null}
                        </p>
                    ) : null}
                    {(talent.matched_skills?.length ?? 0) > 0 ? (
                        <p className="mt-2 text-xs text-emerald-800">Maîtrise : {talent.matched_skills!.slice(0, 3).join(", ")}</p>
                    ) : null}
                    {talent.missing_skills.length > 0 ? (
                        <p className="mt-2 text-xs text-rose-700">
                            Manque{talent.missing_skills.length > 1 ? "s" : ""} : {talent.missing_skills.join(", ")}
                        </p>
                    ) : null}
                </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                {saturated ? (
                    <Tooltip title="Talent saturé — impossible d'affecter sans libérer de la capacité">
                        <span className="inline-flex">{assignButton}</span>
                    </Tooltip>
                ) : (
                    assignButton
                )}
                {saturated ? (
                    <Tooltip title="Libérer ce talent d'un autre projet avant de l'affecter">
                        <Button type="button" color="tertiary" size="sm" onClick={onRedeployHint}>
                            Redéployer
                        </Button>
                    </Tooltip>
                ) : null}
                <Dropdown.Root>
                    <Button
                        color="tertiary"
                        size="sm"
                        aria-label={tm("matchmakerKebabAria", { name: talent.talent_name })}
                        iconLeading={MoreVertical}
                    />
                    <Dropdown.Popover className="min-w-[15rem] rounded-xl p-1 shadow-lg ring-1 ring-secondary/80">
                        <Dropdown.Menu
                            onAction={(actionKey) => {
                                if (actionKey === "custom") onCustomizeAssign(talent);
                                else if (actionKey === "full_time" && !saturated) {
                                    const fullAlloc = Math.min(100, Math.max(0, 100 - Math.round(allocPct)));
                                    if (fullAlloc > 0) {
                                        onQuickAssign(talent, { allocation_pct: fullAlloc, assignment_type: "full_time" });
                                    }
                                } else if (actionKey === "profile" && talentId) onViewProfile(talentId);
                            }}
                        >
                            <Dropdown.Item id="custom" label={tm("matchmakerKebabCustom")} />
                            <Dropdown.Item id="full_time" label={tm("matchmakerKebabFullTime")} isDisabled={saturated} />
                            <Dropdown.Item id="profile" label={tm("matchmakerKebabProfile")} isDisabled={!talentId} />
                        </Dropdown.Menu>
                    </Dropdown.Popover>
                </Dropdown.Root>
                <Button type="button" color="tertiary" size="sm" onClick={() => onDismiss(key)}>
                    {tm("matchmakerDismissCta")}
                </Button>
            </div>
        </li>
    );
}

export function MatchmakerSuggestionsDrawer({
    open,
    projectId,
    projectName,
    activeAssignedTalentIds,
    assigningKey = null,
    hiddenAssignedKeys,
    assignedCount = 0,
    onClose,
    onManualAssign,
    onQuickAssign,
    onCustomizeAssign,
    onViewProfile,
    resolveTalentId,
}: MatchmakerSuggestionsDrawerProps) {
    const { t } = useTranslation("common");
    const tm = (key: string, opts?: Record<string, string | number>) =>
        String(opts ? t(`managerWorkspace.missionControl.${key}`, opts as never) : t(`managerWorkspace.missionControl.${key}`));

    const { push: pushToast } = useToast();
    const matchmaker = useMatchmakerQuery(projectId, projectName, open);
    const orchestratorRecompute = useOrchestratorRecompute();
    const result = matchmaker.data ?? null;
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    useLockBodyScroll(open);

    useEffect(() => {
        if (open) setDismissed(new Set());
    }, [open, projectId]);

    const allSuggestions = result?.top_talents ?? [];

    const { eligibleSuggestions, alreadyInTeamCount } = useMemo(() => {
        const assigned = activeAssignedTalentIds ?? new Set<string>();
        let hidden = 0;
        const eligible: ManagerProjectTalentMatchingTalent[] = [];
        for (const tal of allSuggestions) {
            const talentId = resolveTalentId(tal);
            const normId = normalizeTalentId(talentId);
            if (normId && assigned.has(normId)) {
                hidden += 1;
                continue;
            }
            eligible.push(tal);
        }
        return { eligibleSuggestions: eligible, alreadyInTeamCount: hidden };
    }, [allSuggestions, activeAssignedTalentIds, resolveTalentId]);

    const suggestions = useMemo(() => {
        return eligibleSuggestions.filter((tal) => {
            const key = matchmakerSuggestionKey(tal);
            if (dismissed.has(key)) return false;
            if (hiddenAssignedKeys?.has(key)) return false;
            return true;
        });
    }, [eligibleSuggestions, dismissed, hiddenAssignedKeys]);

    const dismissedCount = dismissed.size;
    const remainingCount = suggestions.length;

    if (!open) return null;

    const showAllAlreadyInTeam = allSuggestions.length > 0 && eligibleSuggestions.length === 0;
    const showSessionAllDone = eligibleSuggestions.length > 0 && remainingCount === 0;
    const displayProjectName = result?.project_name || projectName;
    const showInitialSkeleton = matchmaker.isLoading && !matchmaker.data;
    const isRelaunching = orchestratorRecompute.isPending || matchmaker.isFetching;

    const handleOrchestratorRelaunch = () => {
        orchestratorRecompute.mutate({ scope: "project", project_id: projectId });
    };

    return (
        <div className="fixed inset-0 z-50" aria-hidden={!open}>
            <button type="button" className="absolute inset-0 bg-black/40" aria-label="Fermer" onClick={onClose} />
            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="matchmaker-drawer-title"
                className={cx(
                    "fixed z-50 flex flex-col bg-primary shadow-2xl",
                    "inset-x-0 bottom-0 h-[90dvh] rounded-t-2xl",
                    "lg:inset-y-0 lg:right-0 lg:left-auto lg:h-dvh lg:w-[480px] lg:rounded-none",
                )}
            >
                <header className="flex items-start justify-between gap-3 border-b border-secondary px-5 py-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 id="matchmaker-drawer-title" className="text-base font-semibold text-fg-primary">
                                {tm("matchmakerDrawerTitle")}
                            </h2>
                            <Button
                                type="button"
                                color="tertiary"
                                size="sm"
                                iconLeading={RefreshCcw}
                                isLoading={isRelaunching}
                                title="Relance l'Orchestrateur stratégique pour ce projet (~5–10 s)"
                                onClick={handleOrchestratorRelaunch}
                            >
                                Relancer
                            </Button>
                        </div>
                        <p className="mt-0.5 text-sm text-fg-secondary">{displayProjectName}</p>
                        {allSuggestions.length > 0 && !showInitialSkeleton ? (
                            <p className="mt-1 text-xs text-fg-tertiary">
                                {tm("matchmakerDrawerHeaderCounts", {
                                    visible: eligibleSuggestions.length,
                                    hidden: alreadyInTeamCount,
                                })}
                            </p>
                        ) : null}
                        {result?.adequacy_score != null && !matchmaker.isFetching ? (
                            <p className="mt-1 text-xs text-fg-tertiary">
                                Adéquation projet : <strong>{formatMatchmakerScore10(result.adequacy_score)}</strong>
                            </p>
                        ) : null}
                        {result?.matching_narrative ? (
                            <p className="mt-2 text-xs italic text-fg-secondary">{result.matching_narrative}</p>
                        ) : null}
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-secondary_subtle" aria-label="Fermer">
                        <X className="size-4" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {matchmaker.isFetching && matchmaker.data ? (
                        <div className="mb-3 flex items-center gap-2 text-xs text-fg-tertiary">
                            <Loader2 className="size-3 animate-spin" aria-hidden />
                            Rafraîchissement en cours…
                        </div>
                    ) : null}

                    {showInitialSkeleton ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                            <Loader2 className="size-6 animate-spin text-fg-tertiary" aria-hidden />
                            <p className="text-sm text-fg-secondary">{tm("matchmakerDrawerLoading")}</p>
                        </div>
                    ) : matchmaker.isError ? (
                        <div className="space-y-3 text-center">
                            <p className="text-sm text-fg-secondary">Échec du Matchmaker.</p>
                            <Button type="button" color="primary" size="sm" onClick={handleOrchestratorRelaunch}>
                                Réessayer
                            </Button>
                        </div>
                    ) : allSuggestions.length === 0 ? (
                        <p className="text-sm text-fg-secondary">{tm("matchmakerDrawerEmpty")}</p>
                    ) : showAllAlreadyInTeam ? (
                        <div className="rounded-xl border border-dashed border-secondary bg-primary px-4 py-8 text-center">
                            <p className="text-sm text-fg-secondary">{tm("matchmakerAllAlreadyAssigned")}</p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <Button type="button" color="primary" size="sm" onClick={() => matchmaker.refresh()}>
                                    {tm("matchmakerFooterRerun")}
                                </Button>
                                <Button type="button" color="secondary" size="sm" onClick={onManualAssign}>
                                    {tm("matchmakerManualAssign")}
                                </Button>
                            </div>
                        </div>
                    ) : showSessionAllDone ? (
                        <div className="rounded-xl border border-dashed border-secondary bg-primary px-4 py-8 text-center">
                            <p className="text-sm text-fg-secondary">{tm("matchmakerFooterAllDone")}</p>
                            <Button type="button" color="primary" size="sm" className="mt-4" onClick={() => matchmaker.refresh()}>
                                {tm("matchmakerFooterRerun")}
                            </Button>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {suggestions.map((tal) => (
                                <MatchmakerSuggestionCard
                                    key={matchmakerSuggestionKey(tal)}
                                    talent={tal}
                                    assigningKey={assigningKey}
                                    tm={tm}
                                    resolveTalentId={resolveTalentId}
                                    onQuickAssign={onQuickAssign}
                                    onCustomizeAssign={onCustomizeAssign}
                                    onViewProfile={onViewProfile}
                                    onDismiss={(key) => setDismissed((s) => new Set(s).add(key))}
                                    onRedeployHint={() =>
                                        pushToast(
                                            "Réaffectez ce talent depuis son projet actuel pour libérer de la capacité.",
                                            "info",
                                        )
                                    }
                                />
                            ))}
                        </ul>
                    )}

                    {!showInitialSkeleton && !matchmaker.isError && (result?.recommended_actions?.length ?? 0) > 0 ? (
                        <section className="mt-6 border-t border-secondary pt-4">
                            <h4 className="mb-2 text-xs uppercase tracking-widest text-fg-tertiary">Actions recommandées</h4>
                            <ul className="space-y-2">
                                {result!.recommended_actions.map((action, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <ActionBadge action={action} />
                                        <span className="text-fg-secondary">{action.action_summary}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}
                </div>

                {allSuggestions.length > 0 ? (
                    <footer className="border-t border-secondary px-5 py-3 text-center text-xs text-fg-secondary">
                        {tm("matchmakerFooterCounts", {
                            assigned: assignedCount,
                            dismissed: dismissedCount,
                            remaining: remainingCount,
                        })}
                    </footer>
                ) : null}
            </aside>
        </div>
    );
}
