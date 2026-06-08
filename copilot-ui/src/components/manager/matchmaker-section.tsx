import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import {
    buildSkillGapsSorted,
    looksLikeUuidOrTechnicalId,
    stripTechnicalIdentifiers,
    type MatchmakerSkillGapRow,
} from "@/lib/matchmaker-display";
import {
    formatMatchmakerScore10,
    formatMatchmakerScoreCompact,
    formatMatchmakerStatDisplay,
    MANAGER_DASHBOARD_SECTION_IDS,
} from "@/lib/manager-dashboard-display";
import { useManagerMatchmaker } from "@/hooks/use-manager-matchmaker";
import { useAuth } from "@/providers/auth-provider";

const MATCHMAKER_COLUMN_SCROLL_CLASS = "max-h-[520px] overflow-y-auto";
const TALENTS_PREVIEW_PER_PROJECT = 3;

const MATCHMAKER_EMPTY_RECOMMENDATIONS = "Aucune recommandation prioritaire pour ce manager.";
const MATCHMAKER_EMPTY_TALENTS = "Aucun projet avec candidats disponibles.";
const MATCHMAKER_REFRESH_TOOLTIP_AI =
    "Relance l'analyse multi-projets enrichie par IA. Temps estimé : 30 à 60 secondes.";
const MATCHMAKER_REFRESH_TOOLTIP_FAST = "Relance l'analyse multi-projets. Temps estimé : 10 à 20 secondes.";

function readMatchmakerNumber(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

function readStr(o: Record<string, unknown>, k: string): string {
    const v = o[k];
    return typeof v === "string" && v.trim() ? v.trim() : "";
}

function readOptionalExplanation(matchmaker: unknown): string {
    if (!matchmaker || typeof matchmaker !== "object") return "";
    const v = (matchmaker as Record<string, unknown>).explanation;
    return typeof v === "string" && v.trim() ? v.trim() : "";
}

function readOptionalErrors(matchmaker: unknown): unknown[] {
    if (!matchmaker || typeof matchmaker !== "object") return [];
    const v = (matchmaker as Record<string, unknown>).errors;
    return Array.isArray(v) ? v : [];
}

function readLlmEnrichedCount(matchmaker: unknown): number | null {
    if (!matchmaker || typeof matchmaker !== "object") return null;
    const v = (matchmaker as Record<string, unknown>).llm_enriched_count;
    return readMatchmakerNumber(v);
}

function readAiNarrative(o: Record<string, unknown>): string {
    const v = o.ai_narrative;
    return typeof v === "string" && v.trim() ? v.trim() : "";
}

function readHrDecision(o: Record<string, unknown>): string {
    const v = o.hr_decision;
    return typeof v === "string" && v.trim() ? v.trim() : "";
}

function matchmakerHrDecisionBadge(decision: string): { label: string; className: string } | null {
    const normalized = decision.trim().toLowerCase();
    if (normalized === "proceed") {
        return {
            label: "Procéder",
            className:
                "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
        };
    }
    if (normalized === "adjust") {
        return {
            label: "Ajuster",
            className:
                "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100",
        };
    }
    if (normalized === "recruit_or_postpone") {
        return {
            label: "Recruter / différer",
            className: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100",
        };
    }
    return null;
}

function formatConfidencePercent(confidence: number): string {
    return `conf ${Math.round(confidence * 100)}%`;
}

type TalentCandidateView = {
    name: string;
    overall: number | null;
    skillFit: number | null;
    availabilityScore: number | null;
    scoreMode: string | null;
    currentAllocationPct: number | null;
};

type TalentPickRationaleView = {
    talentName: string;
    whySelected: string;
};

type TalentCriticalGapView = {
    skill: string;
    severity: string;
    mitigation: string;
};

type TalentByProjectGroup = {
    key: string;
    projectName: string;
    projectAdequacyScore: number | null;
    talents: TalentCandidateView[];
    topPicksRationale: TalentPickRationaleView[];
    criticalGaps: TalentCriticalGapView[];
};

function parseStructuredTalentProjects(groups: unknown[], limit = 5): TalentByProjectGroup[] {
    const parsed: TalentByProjectGroup[] = [];

    for (const group of groups) {
        if (!group || typeof group !== "object") continue;
        const g = group as Record<string, unknown>;
        const projectIdRaw = readStr(g, "project_id") || readStr(g, "projectId");
        const projectName = stripTechnicalIdentifiers(readStr(g, "project_name") || "—") || "—";
        const key = projectIdRaw ? `id:${projectIdRaw}` : `name:${projectName}`;

        const talents: TalentCandidateView[] = [];
        const candidates = g.candidates;
        if (Array.isArray(candidates)) {
            for (const candidate of candidates) {
                if (!candidate || typeof candidate !== "object") continue;
                const c = candidate as Record<string, unknown>;
                let name = readStr(c, "talent_name") || readStr(c, "name");
                name = stripTechnicalIdentifiers(name);
                if (!name || looksLikeUuidOrTechnicalId(name)) continue;
                talents.push({
                    name,
                    overall: readMatchmakerNumber(c.overall_score ?? c.score),
                    skillFit: readMatchmakerNumber(c.skill_fit_score ?? c.skills_fit_score),
                    availabilityScore: readMatchmakerNumber(c.availability_score),
                    scoreMode: readStr(c, "score_mode") || null,
                    currentAllocationPct: readMatchmakerNumber(c.current_allocation_pct),
                });
            }
        }

        const topPicksRationale: TalentPickRationaleView[] = [];
        const rationaleRaw = g.top_picks_rationale;
        if (Array.isArray(rationaleRaw)) {
            for (const entry of rationaleRaw.slice(0, 3)) {
                if (!entry || typeof entry !== "object") continue;
                const r = entry as Record<string, unknown>;
                const whySelected = readStr(r, "why_selected");
                if (!whySelected) continue;
                const talentName = stripTechnicalIdentifiers(readStr(r, "talent_name") || "—") || "—";
                topPicksRationale.push({ talentName, whySelected });
            }
        }

        const criticalGaps: TalentCriticalGapView[] = [];
        const gapsRaw = g.critical_gaps;
        if (Array.isArray(gapsRaw)) {
            for (const gap of gapsRaw) {
                if (!gap || typeof gap !== "object") continue;
                const row = gap as Record<string, unknown>;
                const skill = readStr(row, "skill");
                if (!skill) continue;
                criticalGaps.push({
                    skill,
                    severity: readStr(row, "severity"),
                    mitigation: readStr(row, "mitigation"),
                });
            }
        }

        parsed.push({
            key,
            projectName,
            projectAdequacyScore: readMatchmakerNumber(g.adequacy_score),
            talents,
            topPicksRationale,
            criticalGaps,
        });
    }

    return parsed
        .sort((a, b) => b.talents.length - a.talents.length || a.projectName.localeCompare(b.projectName, "fr"))
        .slice(0, limit);
}

function buildTalentGroupsByProject(items: unknown[], limit = 5): TalentByProjectGroup[] {
    const map = new Map<
        string,
        { projectName: string; projectAdequacyScore: number | null; talents: TalentCandidateView[] }
    >();

    for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const projectIdRaw = readStr(o, "project_id") || readStr(o, "projectId");
        const projectName = readStr(o, "project_name") || "—";
        const key = projectIdRaw ? `id:${projectIdRaw}` : `name:${projectName}`;

        let name = readStr(o, "talent_name") || readStr(o, "name") || readStr(o, "talent");
        name = stripTechnicalIdentifiers(name);
        if (!name || looksLikeUuidOrTechnicalId(name)) continue;

        const projectAdequacy = readMatchmakerNumber(o.adequacy_score ?? o.project_adequacy_score);

        if (!map.has(key)) {
            map.set(key, { projectName, projectAdequacyScore: projectAdequacy, talents: [] });
        }
        const group = map.get(key)!;
        if (group.projectAdequacyScore == null && projectAdequacy != null) {
            group.projectAdequacyScore = projectAdequacy;
        }

        group.talents.push({
            name,
            overall: readMatchmakerNumber(o.overall_score ?? o.score),
            skillFit: readMatchmakerNumber(o.skill_fit_score ?? o.skills_fit_score),
            availabilityScore: readMatchmakerNumber(o.availability_score),
            scoreMode: readStr(o, "score_mode") || null,
            currentAllocationPct: readMatchmakerNumber(o.current_allocation_pct),
        });
    }

    return [...map.entries()]
        .map(([k, v]) => ({
            key: k,
            projectName: stripTechnicalIdentifiers(v.projectName) || "—",
            projectAdequacyScore: v.projectAdequacyScore,
            talents: v.talents,
            topPicksRationale: [] as TalentPickRationaleView[],
            criticalGaps: [] as TalentCriticalGapView[],
        }))
        .sort((a, b) => b.talents.length - a.talents.length || a.projectName.localeCompare(b.projectName, "fr"))
        .slice(0, limit);
}

function matchmakerActionTypeBadge(actionType: string): { label: string; className: string } {
    const normalized = actionType.trim().toLowerCase();
    if (normalized === "redeploy") {
        return {
            label: "Redéploiement",
            className:
                "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
        };
    }
    if (normalized === "training") {
        return {
            label: "Formation",
            className:
                "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100",
        };
    }
    if (normalized === "recruitment") {
        return {
            label: "Recrutement",
            className: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100",
        };
    }
    return {
        label: actionType,
        className: "border-secondary bg-secondary_subtle text-secondary",
    };
}

function readRecommendationActionType(o: Record<string, unknown>): string {
    const topRec = readStr(o, "top_recommendation");
    if (topRec) return topRec;
    const actionSummary = readStr(o, "action_summary");
    const lower = actionSummary.toLowerCase();
    if (lower === "redeploy" || lower === "training" || lower === "recruitment") return actionSummary;
    return "";
}

function readRecommendationSummary(o: Record<string, unknown>): string {
    const summary = readStr(o, "summary");
    if (summary) return stripTechnicalIdentifiers(summary);
    const actionSummary = readStr(o, "action_summary");
    const actionType = readRecommendationActionType(o).toLowerCase();
    if (actionSummary && actionSummary.toLowerCase() !== actionType) {
        return stripTechnicalIdentifiers(actionSummary);
    }
    return "";
}

function MatchmakerColumnShell({
    title,
    showEmpty,
    emptyLabel,
    children,
}: {
    title: string;
    showEmpty: boolean;
    emptyLabel: string;
    children: React.ReactNode;
}) {
    return (
        <article className="flex max-h-[520px] min-h-0 flex-col overflow-hidden rounded-2xl border border-secondary/80 bg-primary shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <div className="shrink-0 border-b border-secondary/60 bg-gradient-to-r from-secondary_subtle/40 to-transparent px-5 py-4 dark:from-secondary_subtle/15">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold tracking-tight text-primary">{title}</h4>
                    <span className="shrink-0 rounded-full border border-brand-secondary/35 bg-brand-primary/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-secondary">
                        Matchmaker
                    </span>
                </div>
            </div>
            <div className={`min-h-0 flex-1 p-4 ${MATCHMAKER_COLUMN_SCROLL_CLASS}`}>
                {showEmpty ? (
                    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-secondary/80 bg-primary_alt/80 px-4 py-12 text-center dark:bg-secondary_subtle/10">
                        <p className="max-w-xs text-sm leading-relaxed text-tertiary">{emptyLabel}</p>
                    </div>
                ) : (
                    children
                )}
            </div>
        </article>
    );
}

function MatchmakerMiniKpiCard({ label, value, pulsing }: { label: string; value: string; pulsing?: boolean }) {
    return (
        <article
            className={`rounded-xl border border-secondary/90 bg-primary px-4 py-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] ${pulsing ? "animate-pulse" : ""}`}
        >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-primary">{pulsing ? "…" : value}</p>
        </article>
    );
}

function MatchmakerRecommendationsBlock({
    title,
    items,
    emptyLabel,
}: {
    title: string;
    items: unknown[];
    emptyLabel: string;
}) {
    const showEmpty = items.length === 0;

    return (
        <MatchmakerColumnShell title={title} showEmpty={showEmpty} emptyLabel={emptyLabel}>
            <ul className="space-y-3">
                {items.slice(0, 5).map((item, index) => {
                    if (!item || typeof item !== "object") return null;
                    const o = item as Record<string, unknown>;
                    const projectName = stripTechnicalIdentifiers(readStr(o, "project_name") || "—") || "—";
                    const adequacyScore = readMatchmakerNumber(o.adequacy_score);
                    const actionType = readRecommendationActionType(o);
                    const actionBadge = actionType ? matchmakerActionTypeBadge(actionType) : null;
                    const summary = readRecommendationSummary(o);
                    const projectId = readStr(o, "project_id") || readStr(o, "projectId") || String(index);
                    const aiNarrative = readAiNarrative(o);
                    const hrDecision = readHrDecision(o);
                    const hrBadge = hrDecision ? matchmakerHrDecisionBadge(hrDecision) : null;
                    const confidence = readMatchmakerNumber(o.confidence);
                    const priorityLabel = readStr(o, "priority_level");

                    return (
                        <li
                            key={`mm-rec-${projectId}-${index}`}
                            className="relative rounded-xl border border-secondary/70 border-l-[3px] border-l-brand-secondary bg-primary_alt/70 py-3 pl-3.5 pr-3 dark:bg-secondary_subtle/25"
                        >
                            <div className="flex items-start justify-between gap-2 gap-y-1">
                                <p
                                    className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-primary line-clamp-2"
                                    title={projectName}
                                >
                                    {projectName}
                                </p>
                                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                                    {actionBadge ? (
                                        <span
                                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${actionBadge.className}`}
                                        >
                                            {actionBadge.label}
                                        </span>
                                    ) : null}
                                    {hrBadge ? (
                                        <span
                                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${hrBadge.className}`}
                                        >
                                            {hrBadge.label}
                                        </span>
                                    ) : null}
                                    {priorityLabel ? (
                                        <span className="rounded-full border border-secondary bg-secondary_subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                                            {priorityLabel}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            {adequacyScore != null ? (
                                <p className="mt-1 text-[11px] tabular-nums text-tertiary">
                                    Adéquation {formatMatchmakerScore10(adequacyScore)}
                                </p>
                            ) : null}
                            {summary ? (
                                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-secondary" title={summary}>
                                    {summary}
                                </p>
                            ) : null}
                            {aiNarrative ? (
                                <Tooltip title={aiNarrative} placement="top">
                                    <p className="mt-2 line-clamp-3 text-sm italic leading-relaxed text-tertiary">{aiNarrative}</p>
                                </Tooltip>
                            ) : null}
                            {confidence != null ? (
                                <p className="mt-2 text-right text-[10px] tabular-nums text-tertiary">
                                    {formatConfidencePercent(confidence)}
                                </p>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
        </MatchmakerColumnShell>
    );
}

type ProjectTalentsDrawerState = {
    projectName: string;
    talents: TalentCandidateView[];
} | null;

function TalentCandidateLine({ talent }: { talent: TalentCandidateView }) {
    const saturated = talent.scoreMode === "redeployment_required";

    return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="text-primary">
                {talent.name}
                {talent.currentAllocationPct != null ? (
                    <span className="font-normal text-tertiary"> — alloué {talent.currentAllocationPct}%</span>
                ) : null}
            </span>
            {saturated ? (
                <span className="rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100">
                    Saturé
                </span>
            ) : null}
        </span>
    );
}

function MatchmakerTalentsByProjectBlock({
    title,
    items,
    projectGroups,
    emptyLabel,
}: {
    title: string;
    items: unknown[];
    projectGroups?: unknown[];
    emptyLabel: string;
}) {
    const { t } = useTranslation("common");
    const [drawer, setDrawer] = useState<ProjectTalentsDrawerState>(null);
    const groups = useMemo(() => {
        const structured = parseStructuredTalentProjects(projectGroups ?? [], 5);
        if (structured.length > 0) return structured;
        return buildTalentGroupsByProject(items, 5);
    }, [items, projectGroups]);
    const showEmpty =
        (projectGroups?.length ?? 0) === 0 && items.length === 0 ? true : groups.length === 0;

    return (
        <>
            <MatchmakerColumnShell title={title} showEmpty={showEmpty} emptyLabel={emptyLabel}>
                <ul className="space-y-3">
                    {groups.map((g) => {
                        const preview = g.talents.slice(0, TALENTS_PREVIEW_PER_PROJECT);
                        const extra = g.talents.length - preview.length;

                        return (
                            <li
                                key={g.key}
                                className="rounded-xl border border-secondary/70 border-l-[3px] border-l-indigo-600 bg-primary_alt/70 py-3 pl-4 pr-3 dark:bg-secondary_subtle/25"
                            >
                                <p
                                    className="min-w-0 break-words text-sm font-semibold leading-snug text-primary line-clamp-2"
                                    title={g.projectName}
                                >
                                    {g.projectName}
                                </p>
                                {g.projectAdequacyScore != null ? (
                                    <p className="mt-1 text-[11px] tabular-nums text-tertiary">
                                        Adéquation {formatMatchmakerScore10(g.projectAdequacyScore)}
                                    </p>
                                ) : null}
                                <p className="mt-1 text-[11px] text-tertiary">
                                    {g.talents.length} candidat{g.talents.length > 1 ? "s" : ""} classé{g.talents.length > 1 ? "s" : ""}
                                </p>
                                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                                    {t("managerWorkspace.dashboard.matchmakerTopCandidates")}
                                </p>
                                <ul className="mt-1 space-y-1 pl-0.5">
                                    {preview.map((talent) => (
                                        <li
                                            key={`${g.key}-${talent.name}`}
                                            className="text-xs text-secondary"
                                            title={[
                                                talent.name,
                                                talent.overall != null ? formatMatchmakerScoreCompact(talent.overall) : null,
                                                talent.skillFit != null
                                                    ? t("managerWorkspace.dashboard.matchmakerTalentFit", {
                                                          fit: formatMatchmakerScoreCompact(talent.skillFit),
                                                      })
                                                    : null,
                                                talent.availabilityScore != null
                                                    ? `Dispo ${formatMatchmakerScoreCompact(talent.availabilityScore)}`
                                                    : null,
                                            ]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        >
                                            <TalentCandidateLine talent={talent} />
                                            {(talent.overall != null || talent.skillFit != null || talent.availabilityScore != null) && (
                                                <span className="mt-0.5 block tabular-nums text-tertiary">
                                                    {talent.overall != null ? formatMatchmakerScoreCompact(talent.overall) : null}
                                                    {talent.skillFit != null ? (
                                                        <span>
                                                            {talent.overall != null ? " " : ""}(
                                                            {t("managerWorkspace.dashboard.matchmakerTalentFit", {
                                                                fit: formatMatchmakerScoreCompact(talent.skillFit),
                                                            })}
                                                            )
                                                        </span>
                                                    ) : null}
                                                    {talent.availabilityScore != null ? (
                                                        <span>
                                                            {" "}
                                                            · Dispo {formatMatchmakerScoreCompact(talent.availabilityScore)}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                {extra > 0 ? (
                                    <button
                                        type="button"
                                        className="mt-2 text-xs font-semibold text-brand-secondary hover:underline"
                                        onClick={() => setDrawer({ projectName: g.projectName, talents: g.talents })}
                                    >
                                        {t("managerWorkspace.dashboard.matchmakerViewMoreTalents", { count: extra })}
                                    </button>
                                ) : null}
                                {g.topPicksRationale.length > 0 ? (
                                    <div className="mt-3 rounded-lg border border-secondary/60 bg-primary_alt/60 px-3 py-2 dark:bg-secondary_subtle/20">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                                            Pourquoi ces talents :
                                        </p>
                                        <ul className="mt-1.5 space-y-1.5">
                                            {g.topPicksRationale.map((pick) => (
                                                <li key={`${g.key}-${pick.talentName}-${pick.whySelected.slice(0, 24)}`} className="text-xs text-secondary">
                                                    <span className="font-medium text-primary">{pick.talentName}</span>
                                                    <span className="text-tertiary"> — {pick.whySelected}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
                                {g.criticalGaps.length > 0 ? (
                                    <details className="mt-3 group">
                                        <summary className="cursor-pointer text-xs font-semibold text-brand-secondary hover:underline">
                                            {g.criticalGaps.length} écart{g.criticalGaps.length > 1 ? "s" : ""} critique
                                            {g.criticalGaps.length > 1 ? "s" : ""}
                                        </summary>
                                        <ul className="mt-2 space-y-2 border-l-2 border-amber-300/70 pl-3 dark:border-amber-700/60">
                                            {g.criticalGaps.map((gap) => (
                                                <li key={`${g.key}-${gap.skill}`} className="text-xs text-secondary">
                                                    <p className="font-medium text-primary">{gap.skill}</p>
                                                    {gap.severity ? (
                                                        <p className="text-tertiary">Sévérité : {gap.severity}</p>
                                                    ) : null}
                                                    {gap.mitigation ? (
                                                        <p className="text-tertiary">Mitigation : {gap.mitigation}</p>
                                                    ) : null}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            </MatchmakerColumnShell>

            {drawer ? (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] dark:bg-black/50"
                        aria-label={t("managerWorkspace.dashboard.analystNineBoxModalClose")}
                        onClick={() => setDrawer(null)}
                    />
                    <aside
                        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-secondary bg-primary shadow-2xl"
                        role="dialog"
                        aria-modal="true"
                    >
                        <header className="flex items-start justify-between gap-3 border-b border-secondary px-5 py-4">
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">Matchmaker</p>
                                <h2 className="mt-1 truncate text-lg font-bold text-primary">
                                    {t("managerWorkspace.dashboard.matchmakerProjectTalentsDrawerTitle", {
                                        project: drawer.projectName,
                                    })}
                                </h2>
                                <p className="mt-1 text-xs tabular-nums text-tertiary">
                                    {t("managerWorkspace.dashboard.analystNineBoxDrawerCount", {
                                        count: drawer.talents.length,
                                    })}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDrawer(null)}
                                className="rounded-lg p-2 text-tertiary hover:bg-secondary_subtle"
                                aria-label={t("managerWorkspace.dashboard.analystNineBoxModalClose")}
                            >
                                <X className="size-5" />
                            </button>
                        </header>
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                            <ul className="space-y-2">
                                {drawer.talents.map((talent) => (
                                    <li
                                        key={talent.name}
                                        className="rounded-xl border border-secondary/70 bg-primary_alt/80 px-3 py-2.5 dark:bg-secondary_subtle/25"
                                    >
                                        <TalentCandidateLine talent={talent} />
                                        <p className="mt-0.5 truncate text-xs tabular-nums text-tertiary">
                                            {talent.overall != null ? <span>{formatMatchmakerScoreCompact(talent.overall)}</span> : null}
                                            {talent.skillFit != null ? (
                                                <span>
                                                    {talent.overall != null ? " · " : ""}
                                                    {t("managerWorkspace.dashboard.matchmakerTalentFit", {
                                                        fit: formatMatchmakerScoreCompact(talent.skillFit),
                                                    })}
                                                </span>
                                            ) : null}
                                            {talent.availabilityScore != null ? (
                                                <span>
                                                    {" "}
                                                    · Dispo {formatMatchmakerScoreCompact(talent.availabilityScore)}
                                                </span>
                                            ) : null}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>
                </>
            ) : null}
        </>
    );
}

function MatchmakerSkillGapsBlock({
    title,
    items,
    emptyLabel,
}: {
    title: string;
    items: unknown[];
    emptyLabel: string;
}) {
    const { t } = useTranslation("common");
    const rows = useMemo(() => buildSkillGapsSorted(items, 5), [items]);
    const showEmpty = items.length === 0 || rows.length === 0;

    return (
        <MatchmakerColumnShell title={title} showEmpty={showEmpty} emptyLabel={emptyLabel}>
            <ul className="space-y-3">
                {rows.map((row: MatchmakerSkillGapRow) => (
                    <li
                        key={row.key}
                        className="rounded-xl border border-secondary/70 border-l-[3px] border-l-amber-600 bg-primary_alt/70 px-4 py-3 dark:bg-secondary_subtle/25"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-primary" title={row.title}>
                                {row.title}
                            </p>
                            {row.occurrenceCount > 0 ? (
                                <span className="shrink-0 rounded-full border border-secondary bg-primary px-2 py-0.5 text-[10px] font-semibold tabular-nums text-secondary">
                                    {t("managerWorkspace.dashboard.matchmakerOccurrencesBadge", {
                                        count: row.occurrenceCount,
                                    })}
                                </span>
                            ) : null}
                        </div>
                        {row.subtitle ? (
                            <p className="mt-1.5 truncate text-xs leading-relaxed text-tertiary" title={row.subtitle}>
                                {row.subtitle}
                            </p>
                        ) : null}
                    </li>
                ))}
            </ul>
        </MatchmakerColumnShell>
    );
}

function MatchmakerSectionSkeleton() {
    return (
        <div className="space-y-5" aria-busy="true" aria-label="Chargement des données Matchmaker">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={`mm-kpi-skel-${i}`}
                        className="h-[72px] animate-pulse rounded-xl border border-secondary/60 bg-secondary_subtle/80 dark:bg-secondary_subtle/30"
                    />
                ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={`mm-col-skel-${i}`}
                        className="h-[520px] animate-pulse rounded-2xl border border-secondary/60 bg-secondary_subtle/60 dark:bg-secondary_subtle/25"
                    />
                ))}
            </div>
        </div>
    );
}

export function MatchmakerSection() {
    const { t } = useTranslation("common");
    const { user } = useAuth();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { matchmaker, isLoading, isFetching, isError, refetchAll, hasContext, useAiEnabled } = useManagerMatchmaker(
        user?.id,
        user?.enterpriseId,
    );

    const stats = matchmaker?.stats;
    const topRecommendations = matchmaker?.top_recommendations ?? [];
    const topUnassignedMatches = matchmaker?.top_unassigned_matches ?? [];
    const topTalentProjects = matchmaker?.top_talents_by_project ?? [];
    const topSkillGaps = matchmaker?.top_skill_gaps ?? [];
    const explanation = readOptionalExplanation(matchmaker);
    const batchErrors = readOptionalErrors(matchmaker);
    const llmEnrichedCount = readLlmEnrichedCount(matchmaker);
    const refreshTooltip = useAiEnabled ? MATCHMAKER_REFRESH_TOOLTIP_AI : MATCHMAKER_REFRESH_TOOLTIP_FAST;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refetchAll();
        } finally {
            setIsRefreshing(false);
        }
    };

    const showLoading = isLoading || isFetching || isRefreshing;

    const hasData =
        (stats?.projects_with_matching ?? 0) > 0 ||
        topRecommendations.length > 0 ||
        topUnassignedMatches.length > 0 ||
        topSkillGaps.length > 0;

    return (
        <section
            id={MANAGER_DASHBOARD_SECTION_IDS.matchmaker}
            className="scroll-mt-24 space-y-5 rounded-2xl border border-secondary bg-primary p-5 shadow-sm"
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-primary">{t("managerWorkspace.dashboard.matchmakerTitle")}</h3>
                        <span className="rounded-full border border-brand-secondary/40 bg-brand-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-brand-secondary">
                            Matchmaker
                        </span>
                        {llmEnrichedCount != null && llmEnrichedCount > 0 ? (
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
                                AI enrichi ({llmEnrichedCount} projet{llmEnrichedCount > 1 ? "s" : ""})
                            </span>
                        ) : null}
                    </div>
                    <p className="max-w-3xl text-sm text-secondary">{t("managerWorkspace.dashboard.matchmakerSubtitle")}</p>
                    {explanation ? (
                        <p className="max-w-3xl text-sm italic text-tertiary">{explanation}</p>
                    ) : null}
                </div>
                <Tooltip title={refreshTooltip} placement="bottom">
                    <button
                        type="button"
                        className="shrink-0 self-start rounded-lg border border-secondary bg-primary_alt px-2.5 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary_subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-50"
                        disabled={!hasContext || showLoading}
                        aria-label={`${t("managerWorkspace.dashboard.refresh")}. ${refreshTooltip}`}
                        onClick={() => {
                            void handleRefresh();
                        }}
                    >
                        {t("managerWorkspace.dashboard.refresh")}
                    </button>
                </Tooltip>
            </div>

            {!hasContext ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-secondary/80 bg-primary_alt/80 px-4 py-16 text-center dark:bg-secondary_subtle/10">
                    <p className="max-w-md text-sm leading-relaxed text-tertiary">{t("managerWorkspace.dashboard.matchmakerEmpty")}</p>
                </div>
            ) : showLoading ? (
                <MatchmakerSectionSkeleton />
            ) : isError ? (
                <div
                    role="alert"
                    className="rounded-xl border border-error-secondary/40 bg-error-primary/10 px-4 py-6 text-center text-sm text-error-primary"
                >
                    Impossible de charger les données Matchmaker.
                </div>
            ) : !hasData ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-secondary/80 bg-primary_alt/80 px-4 py-16 text-center dark:bg-secondary_subtle/10">
                    <p className="max-w-md text-sm leading-relaxed text-tertiary">{t("managerWorkspace.dashboard.matchmakerEmpty")}</p>
                </div>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <MatchmakerMiniKpiCard
                            label={t("managerWorkspace.dashboard.matchmakerKpiProjects")}
                            value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.projects_with_matching))}
                        />
                        <MatchmakerMiniKpiCard
                            label={t("managerWorkspace.dashboard.matchmakerKpiAvgScore")}
                            value={formatMatchmakerScore10(readMatchmakerNumber(stats?.avg_match_score))}
                        />
                        <MatchmakerMiniKpiCard
                            label={t("managerWorkspace.dashboard.matchmakerKpiGaps")}
                            value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.total_gaps))}
                        />
                        <MatchmakerMiniKpiCard
                            label={t("managerWorkspace.dashboard.matchmakerKpiRecruitment")}
                            value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.recruitment_needed))}
                        />
                        <MatchmakerMiniKpiCard
                            label={t("managerWorkspace.dashboard.matchmakerKpiTraining")}
                            value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.training_needed))}
                        />
                        <MatchmakerMiniKpiCard
                            label={t("managerWorkspace.dashboard.matchmakerKpiRedeploy")}
                            value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.redeploy_possible), {
                                capOver100: true,
                            })}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
                        <MatchmakerRecommendationsBlock
                            title={t("managerWorkspace.dashboard.matchmakerBlockRecommendations")}
                            items={topRecommendations}
                            emptyLabel={MATCHMAKER_EMPTY_RECOMMENDATIONS}
                        />
                        <MatchmakerTalentsByProjectBlock
                            title={t("managerWorkspace.dashboard.matchmakerBlockUnassigned")}
                            items={topUnassignedMatches}
                            projectGroups={topTalentProjects}
                            emptyLabel={MATCHMAKER_EMPTY_TALENTS}
                        />
                        <MatchmakerSkillGapsBlock
                            title={t("managerWorkspace.dashboard.matchmakerBlockSkillGaps")}
                            items={topSkillGaps}
                            emptyLabel={t("managerWorkspace.dashboard.matchmakerEmptySkillGaps")}
                        />
                    </div>

                    {batchErrors.length > 0 ? (
                        <div
                            role="status"
                            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
                        >
                            {batchErrors.length} projet{batchErrors.length > 1 ? "s" : ""} n&apos;ont pas pu être analysés. Détails
                            dans l&apos;audit n8n.
                        </div>
                    ) : null}
                </>
            )}
        </section>
    );
}
