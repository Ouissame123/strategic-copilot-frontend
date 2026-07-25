import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    AlertCircle,
    Check,
    Loader2,
    RefreshCw,
    Search,
    Sparkles,
    UserPlus,
    X,
} from "lucide-react";
import { buildStrictAssignTalentPayload } from "@/api/manager-projects.api";
import { buildBrowserFetchN8nUrl } from "@/lib/build-n8n-url";
import { API_ROUTES } from "@/lib/api-routes";
import { readMissionControlHttpErrorMessage } from "@/lib/user-facing-api-error";
import { pickTalentDisplayName } from "@/components/project-mission-control/utils";
import { useAssignTalent, useUnassignTalent } from "@/hooks/useProjects";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/providers/toast-provider";
import type { MatchmakerResponse } from "@/services/agents.api";
import { useMissionControlT } from "../use-mission-control-i18n";
import type { MissionControlAssignment, MissionControlRequirement, WmpAssignmentType } from "@/types/api.types";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";
import { cx } from "@/utils/cx";

type TeamTabProps = {
    projectId: string;
    enterpriseId: string;
    token: string;
    projectName?: string;
    assignments: MissionControlAssignment[];
    requirements: MissionControlRequirement[];
    skillsScore: number | null;
    onRefresh: () => void;
};

function clamp(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
}

function normalizeId(value: unknown): string {
    return String(value ?? "").trim().toLowerCase();
}

function avatarColor(name: string): string {
    const colors = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function authHeaders(token: string): HeadersInit {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

async function fetchMatchmaker(projectId: string, enterpriseId: string, token: string): Promise<MatchmakerResponse> {
    const res = await fetch(buildBrowserFetchN8nUrl(API_ROUTES.matchmaker()), {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
            project_id: projectId,
            enterprise_id: enterpriseId,
            force_refresh: true,
            simulation_mode: false,
            use_ai: true,
            top_n: 5,
        }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const root = unwrapN8nRoot(json) as Record<string, unknown>;
        throw new Error(String(root.message ?? root.error ?? `HTTP ${res.status}`));
    }
    return unwrapN8nRoot(json) as MatchmakerResponse;
}

async function postMatchmakerAssignment(projectId: string, token: string, talentId: string): Promise<void> {
    const body = buildStrictAssignTalentPayload({
        talent_id: talentId,
        allocation_pct: 50,
        assignment_type: "part_time",
        start_date: null,
        end_date: null,
        role_on_project: null,
    });
    const res = await fetch(buildBrowserFetchN8nUrl(API_ROUTES.projectAssign(projectId)), {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    const root = unwrapN8nRoot(json) as Record<string, unknown>;
    if (!res.ok || String(root.status ?? "").toLowerCase() !== "success") {
        throw new Error(String(root.message ?? `HTTP ${res.status}`));
    }
}

type MatchmakerDrawerProps = {
    open: boolean;
    onClose: () => void;
    projectName: string;
    data: MatchmakerResponse | null;
    loading: boolean;
    error: string | null;
    assigningId: string | null;
    assignedIds: Set<string>;
    ignoredIds: Set<string>;
    onIgnore: (talentId: string) => void;
    onRestoreIgnored: () => void;
    onAssign: (talentId: string, talentName: string) => void;
    onRelancer: () => void;
};

function MatchmakerDrawer({
    open,
    onClose,
    projectName,
    data,
    loading,
    error,
    assigningId,
    assignedIds,
    ignoredIds,
    onIgnore,
    onRestoreIgnored,
    onAssign,
    onRelancer,
}: MatchmakerDrawerProps) {
    useLockBodyScroll(open);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    const score = data?.matching?.project_adequacy_score;
    const narrative =
        data?.ai?.matching_narrative || data?.copilot?.message || data?.explanation || "";
    const talents = (data?.matching?.top_talents ?? []).filter((t) => !ignoredIds.has(t.talent_id));
    const rationales = data?.ai?.top_picks_rationale ?? [];
    const meta = (data as MatchmakerResponse & { meta?: { computed_at?: string } })?.meta;
    const aiExtra = data?.ai as (MatchmakerResponse["ai"] & { model?: string }) | undefined;

    const drawer = (
        <>
            <div
                className="fixed inset-0 z-[9998] bg-black/30"
                role="presentation"
                onClick={onClose}
                aria-hidden
            />
            <aside
                className={cx(
                    "fixed top-0 right-0 z-[9999] flex h-screen w-full flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-200 sm:w-[480px] dark:border-slate-700 dark:bg-slate-900",
                    open ? "translate-x-0" : "translate-x-full",
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby="matchmaker-drawer-title"
            >
                <header className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                    <div>
                        <h2 id="matchmaker-drawer-title" className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
                            Suggestions Matchmaker
                        </h2>
                        <p className="text-xs text-slate-500">{data?.project?.name || projectName || "Projet"}</p>
                        {score != null && Number.isFinite(score) ? (
                            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                                Adéquation projet : {score} / 10
                            </p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Fermer"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {loading ? (
                        <div className="py-10 text-center text-sm text-slate-500">
                            <Loader2 className="mx-auto mb-3 size-[22px] animate-spin text-primary-600" aria-hidden />
                            Analyse Matchmaker en cours…
                        </div>
                    ) : null}

                    {error && !loading ? (
                        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
                            {error}
                        </div>
                    ) : null}

                    {data && !loading ? (
                        <>
                            {narrative ? (
                                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
                                    <div className="flex items-start gap-2">
                                        <Sparkles size={15} className="mt-0.5 shrink-0 text-primary-600" aria-hidden />
                                        <p className="break-words text-[13px] leading-relaxed whitespace-normal text-slate-600 dark:text-slate-300">
                                            {narrative}
                                        </p>
                                    </div>
                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                        {score != null ? (
                                            <span
                                                className={cx(
                                                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                                    score >= 7
                                                        ? "bg-emerald-100 text-emerald-900"
                                                        : "bg-amber-100 text-amber-900",
                                                )}
                                            >
                                                Adéquation {score}/10
                                            </span>
                                        ) : null}
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-600 dark:bg-slate-900">
                                            {data.matching?.all_talents_count ?? 0} talents analysés
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-600 dark:bg-slate-900">
                                            {data.matching?.requirements_count ?? 0} compétence(s) requise(s)
                                        </span>
                                        {data.ai?.confidence != null ? (
                                            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] text-primary-900">
                                                IA confiance {Math.round(data.ai.confidence * 100)}%
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}

                            {data.recommended_actions?.[0] ? (
                                <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                                    <Check size={14} aria-hidden />
                                    {data.recommended_actions[0].action_summary}
                                </div>
                            ) : null}

                            <div className="mb-2.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                                {talents.length} talents recommandés
                                <span className="ml-1.5 text-[11px] font-normal text-slate-500">triés par score global</span>
                            </div>

                            {talents.length === 0 ? (
                                <p className="text-center text-sm text-slate-500">
                                    Aucun talent correspondant trouvé pour ce projet.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {talents.map((talent) => {
                                        const isAssigned = assignedIds.has(talent.talent_id);
                                        const isAssigning = assigningId === talent.talent_id;
                                        const color = avatarColor(talent.talent_name);
                                        const load = talent.current_allocation_pct ?? 0;
                                        const rationale = rationales.find((r) => r.talent_name === talent.talent_name);
                                        const conditionsText = Array.isArray(rationale?.conditions)
                                            ? rationale!.conditions!.join(" ")
                                            : typeof rationale?.conditions === "string"
                                              ? rationale.conditions
                                              : "";

                                        return (
                                            <div
                                                key={talent.talent_id}
                                                className={cx(
                                                    "rounded-[10px] border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900",
                                                    isAssigned && "opacity-75",
                                                )}
                                            >
                                                <div className="mb-2 flex items-start gap-2.5">
                                                    <div
                                                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                                                        style={{ backgroundColor: `${color}22`, color }}
                                                    >
                                                        {initials(talent.talent_name)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
                                                                {talent.talent_name}
                                                            </span>
                                                            {talent.rank <= 3 ? (
                                                                <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-900">
                                                                    #{talent.rank}
                                                                </span>
                                                            ) : null}
                                                            <span
                                                                className={cx(
                                                                    "rounded-full px-1.5 py-0.5 text-[10px]",
                                                                    load === 0
                                                                        ? "bg-emerald-100 text-emerald-900"
                                                                        : load >= 80
                                                                          ? "bg-rose-100 text-rose-900"
                                                                          : "bg-amber-100 text-amber-900",
                                                                )}
                                                            >
                                                                {load === 0 ? "Disponible" : `Chargé à ${Math.round(load)}%`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0">
                                                        {isAssigned ? (
                                                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                                                                <Check size={14} aria-hidden />
                                                                Affecté
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                disabled={isAssigning || !!assigningId}
                                                                onClick={() => onAssign(talent.talent_id, talent.talent_name)}
                                                                className={cx(
                                                                    "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium",
                                                                    isAssigning
                                                                        ? "cursor-not-allowed bg-primary-100 text-primary-800"
                                                                        : "bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50",
                                                                )}
                                                            >
                                                                {isAssigning ? (
                                                                    <>
                                                                        <Loader2 size={12} className="animate-spin" />
                                                                        En cours…
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserPlus size={12} aria-hidden />
                                                                        Affecter
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mb-1.5 flex flex-wrap gap-3 text-xs text-slate-500">
                                                    <span>
                                                        Fit compétences :{" "}
                                                        <strong className="text-slate-800 dark:text-slate-200">
                                                            {talent.skill_fit_score}/10
                                                        </strong>
                                                    </span>
                                                    <span>
                                                        Disponibilité :{" "}
                                                        <strong className="text-slate-800 dark:text-slate-200">
                                                            {talent.availability_score}/10
                                                        </strong>
                                                    </span>
                                                    <span>
                                                        Score global :{" "}
                                                        <strong className="text-primary-700">{talent.overall_score}/10</strong>
                                                    </span>
                                                </div>

                                                {talent.matched_skills?.length ? (
                                                    <div className="mb-1 flex flex-wrap gap-1">
                                                        {talent.matched_skills.map((s) => (
                                                            <span
                                                                key={s.skill_id}
                                                                className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-900"
                                                            >
                                                                {s.skill_name} · niv.{s.talent_level}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : null}

                                                {talent.missing_skills?.length ? (
                                                    <div className="mb-1 flex flex-wrap gap-1">
                                                        {talent.missing_skills.map((s) => (
                                                            <span
                                                                key={s.skill_id}
                                                                className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-900"
                                                            >
                                                                {s.skill_name} manquant
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : null}

                                                {rationale?.why_selected ? (
                                                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500 italic">
                                                        {rationale.why_selected}
                                                        {conditionsText &&
                                                        conditionsText !==
                                                            "Aucune restriction particulière, disponibilité maximale." ? (
                                                            <span className="text-amber-600"> — {conditionsText}</span>
                                                        ) : null}
                                                    </p>
                                                ) : null}

                                                {!isAssigned ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => onIgnore(talent.talent_id)}
                                                        className="mt-1 text-[11px] text-slate-500 underline hover:text-slate-700"
                                                    >
                                                        Ignorer cette suggestion
                                                    </button>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {ignoredIds.size > 0 ? (
                                <button
                                    type="button"
                                    onClick={onRestoreIgnored}
                                    className="mt-3 text-xs text-slate-500 underline hover:text-slate-700"
                                >
                                    Afficher les {ignoredIds.size} suggestion(s) ignorée(s)
                                </button>
                            ) : null}
                        </>
                    ) : null}
                </div>

                {data ? (
                    <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 px-5 py-2.5 text-[11px] text-slate-500 dark:border-slate-700">
                        <span>
                            {aiExtra?.model ? `${aiExtra.model} via ` : ""}
                            {data.ai?.provider ?? "IA"}
                            {meta?.computed_at
                                ? ` · ${new Date(meta.computed_at).toLocaleString("fr-FR", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                  })}`
                                : ""}
                        </span>
                        <button
                            type="button"
                            onClick={onRelancer}
                            className="inline-flex items-center gap-1 text-primary-600 hover:underline"
                        >
                            <RefreshCw size={12} aria-hidden />
                            Relancer
                        </button>
                    </footer>
                ) : null}
            </aside>
        </>
    );

    return createPortal(drawer, document.body);
}

export function TeamTab({
    projectId,
    enterpriseId,
    token,
    projectName = "",
    assignments,
    requirements: _requirements,
    skillsScore,
    onRefresh,
}: TeamTabProps) {
    const { mc } = useMissionControlT();
    const { push: toast } = useToast();
    const teamQuery = useTeam({ scope: "enterprise", limit: 500 });
    const assignTalent = useAssignTalent();
    const unassignTalent = useUnassignTalent();
    const assignmentTypeTouched = useRef(false);

    const [assignPayload, setAssignPayload] = useState<{
        talent_id: string;
        allocation_pct: number;
        assignment_type: WmpAssignmentType;
    }>({ talent_id: "", allocation_pct: 50, assignment_type: "part_time" });

    const [matchmakerData, setMatchmakerData] = useState<MatchmakerResponse | null>(null);
    const [matchmakerLoading, setMatchmakerLoading] = useState(false);
    const [matchmakerError, setMatchmakerError] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [ignoredIds, setIgnoredIds] = useState<Set<string>>(() => new Set());
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [matchmakerAssignedIds, setMatchmakerAssignedIds] = useState<Set<string>>(() => new Set());

    const teamNameById = useMemo(
        () =>
            new Map(
                (teamQuery.data?.talents ?? []).map((t) => [
                    normalizeId(t.id),
                    String(t.full_name ?? "").trim(),
                ]),
            ),
        [teamQuery.data?.talents],
    );

    const assignedTalentIds = useMemo(() => new Set(assignments.map((a) => a.talent_id)), [assignments]);

    const effectiveAssignedIds = useMemo(() => {
        const merged = new Set(assignedTalentIds);
        for (const id of matchmakerAssignedIds) merged.add(id);
        return merged;
    }, [assignedTalentIds, matchmakerAssignedIds]);

    const availableTalents = useMemo(
        () => (teamQuery.data?.talents ?? []).filter((t) => !assignedTalentIds.has(t.id)),
        [teamQuery.data?.talents, assignedTalentIds],
    );

    const skillsGap = skillsScore != null && skillsScore < 4;

    async function handleMatchmaker() {
        if (!token.trim()) {
            toast("Session expirée — reconnectez-vous", "error");
            return;
        }
        setDrawerOpen(true);
        setMatchmakerLoading(true);
        setMatchmakerError(null);
        try {
            const result = await fetchMatchmaker(projectId, enterpriseId, token);
            const status = String(result.status ?? "").toLowerCase();
            if (status === "success" || status === "no_matching_results") {
                setMatchmakerData(result);
            } else {
                setMatchmakerError(String((result as { message?: string }).message ?? "Erreur inconnue"));
            }
        } catch (e: unknown) {
            setMatchmakerError(e instanceof Error ? e.message : "Erreur réseau");
        } finally {
            setMatchmakerLoading(false);
        }
    }

    async function handleAssignFromMatchmaker(talentId: string, talentName: string) {
        if (!token.trim()) {
            toast("Session expirée — reconnectez-vous", "error");
            return;
        }
        setAssigningId(talentId);
        try {
            await postMatchmakerAssignment(projectId, token, talentId);
            setMatchmakerAssignedIds((prev) => new Set([...prev, talentId]));
            toast(`${talentName} assigné au projet`, "success");
            onRefresh();
        } catch (e: unknown) {
            toast(e instanceof Error ? e.message : "Erreur assignation", "error");
        } finally {
            setAssigningId(null);
        }
    }

    const handleAssign = (talentId: string, talentDisplayName?: string, allocation = assignPayload.allocation_pct) => {
        const alloc = clamp(Number(allocation) || 0, 0, 100);
        const assignment_type: WmpAssignmentType =
            assignPayload.assignment_type || (alloc >= 80 ? "full_time" : "part_time");
        let body;
        try {
            body = buildStrictAssignTalentPayload({
                talent_id: talentId,
                allocation_pct: alloc,
                assignment_type,
                start_date: null,
                end_date: null,
                role_on_project: null,
            });
        } catch {
            toast(mc("assignTalentError", { message: "Données invalides" }), "error");
            return;
        }
        assignTalent.mutate(
            { projectId, body, talentDisplayName },
            {
                onSuccess: () => {
                    toast(mc("assignSuccessToast"), "success");
                    assignmentTypeTouched.current = false;
                    setAssignPayload({ talent_id: "", allocation_pct: 50, assignment_type: "part_time" });
                    onRefresh();
                },
                onError: (err) => {
                    toast(mc("assignTalentError", { message: readMissionControlHttpErrorMessage(err) }), "error");
                },
            },
        );
    };

    const handleUnassign = (talentId: string) => {
        unassignTalent.mutate(
            { projectId, talentId },
            {
                onSuccess: () => {
                    toast(mc("unassignSuccessToast"), "success");
                    onRefresh();
                },
                onError: (err) => {
                    toast(mc("unassignTalentError", { message: readMissionControlHttpErrorMessage(err) }), "error");
                },
            },
        );
    };

    return (
        <div className="space-y-5 p-5">
            {skillsGap ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                    <p className="font-semibold">{mc("team.skillsGapTitle")}</p>
                    <p className="mt-1 text-xs leading-relaxed opacity-90">
                        {mc("team.skillsGapBody", {
                            score: skillsScore != null ? skillsScore.toFixed(1) : "—",
                        })}
                    </p>
                </div>
            ) : null}

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{mc("teamSectionTitle")}</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 md:col-span-2">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{mc("pickTalent")}</span>
                        <select
                            value={assignPayload.talent_id}
                            onChange={(e) => setAssignPayload((p) => ({ ...p, talent_id: e.target.value }))}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                            disabled={teamQuery.isLoading}
                        >
                            <option value="">{mc("pickTalent")}</option>
                            {availableTalents.map((talent) => (
                                <option key={talent.id} value={talent.id}>
                                    {talent.full_name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{mc("labelAllocationPercent")}</span>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={assignPayload.allocation_pct}
                            onChange={(e) => {
                                const n = clamp(Number(e.target.value) || 0, 0, 100);
                                setAssignPayload((p) => ({
                                    ...p,
                                    allocation_pct: n,
                                    ...(!assignmentTypeTouched.current
                                        ? { assignment_type: n >= 80 ? "full_time" : "part_time" }
                                        : {}),
                                }));
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{mc("labelAssignmentType")}</span>
                        <select
                            value={assignPayload.assignment_type}
                            onChange={(e) => {
                                assignmentTypeTouched.current = true;
                                setAssignPayload((p) => ({
                                    ...p,
                                    assignment_type: e.target.value as WmpAssignmentType,
                                }));
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                        >
                            <option value="full_time">{mc("assignTypeFullTime")}</option>
                            <option value="part_time">{mc("assignTypePartTime")}</option>
                            <option value="backup">{mc("assignTypeBackup")}</option>
                            <option value="temporary">{mc("assignTypeTemporary")}</option>
                        </select>
                    </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={assignTalent.isPending || !assignPayload.talent_id.trim()}
                        onClick={() => {
                            const talent = availableTalents.find((t) => t.id === assignPayload.talent_id);
                            handleAssign(assignPayload.talent_id, talent?.full_name);
                        }}
                        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                        {mc("assign")}
                    </button>
                    {matchmakerData && !matchmakerLoading ? (
                        <button
                            type="button"
                            onClick={() => setDrawerOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100 dark:border-primary-900 dark:bg-primary-950/30 dark:text-primary-200"
                        >
                            <Sparkles size={14} aria-hidden />
                            Voir les suggestions
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void handleMatchmaker()}
                            disabled={matchmakerLoading}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-300 bg-white px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50 dark:border-primary-800 dark:bg-slate-900 dark:text-primary-300"
                        >
                            {matchmakerLoading ? (
                                <Loader2 size={14} className="animate-spin" aria-hidden />
                            ) : (
                                <Search size={14} aria-hidden />
                            )}
                            Trouver des talents
                        </button>
                    )}
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{mc("teamDeployedTitle")}</h3>
                {assignments.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">{mc("noAssignmentsOnProject")}</p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {assignments.map((a) => {
                            const talentId = String(a.talent_id ?? "").trim();
                            const displayName = pickTalentDisplayName(
                                {
                                    talentName: a.talent_name,
                                    mappedName: teamNameById.get(normalizeId(a.talent_id)),
                                    talentEmail: a.talent_email,
                                    talentId,
                                },
                                mc("unknownTalent"),
                            );
                            return (
                                <li
                                    key={a.id || talentId}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{displayName}</p>
                                        <p className="text-xs text-slate-500">
                                            {mc("allocationPrefix")} {Math.round(a.allocation_pct)}%
                                            {a.role_on_project ? ` · ${a.role_on_project}` : ""}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!talentId || unassignTalent.isPending}
                                        onClick={() => talentId && handleUnassign(talentId)}
                                        className="shrink-0 rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300"
                                    >
                                        {mc("unassign")}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <MatchmakerDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                projectName={projectName}
                data={matchmakerData}
                loading={matchmakerLoading}
                error={matchmakerError}
                assigningId={assigningId}
                assignedIds={effectiveAssignedIds}
                ignoredIds={ignoredIds}
                onIgnore={(id) => setIgnoredIds((prev) => new Set([...prev, id]))}
                onRestoreIgnored={() => setIgnoredIds(new Set())}
                onAssign={(id, name) => void handleAssignFromMatchmaker(id, name)}
                onRelancer={() => void handleMatchmaker()}
            />
        </div>
    );
}
