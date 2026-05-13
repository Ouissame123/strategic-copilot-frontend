import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { PageHero } from "@/components/layout/PageHero";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Eye } from "@untitledui/icons";
import { useTeam, useWatchdogScan } from "@/hooks/useTeam";
import { useToast } from "@/providers/toast-provider";
import type { TalentListItem } from "@/types/api.types";

type SortKey = "name" | "alerts" | "priority" | "milestone" | "allocation" | "ipi" | "contract" | "status" | "decision";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clamp(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
}

/** Clé React / API : `talent_id` (UUID) si le backend l’envoie, sinon `id` (évite clés dupliquées vides). */
function talentStableId(t: TalentListItem): string {
    const fromTid = String(t.talent_id ?? "").trim();
    if (fromTid) return fromTid;
    const fromId = String(t.id ?? "").trim();
    if (fromId) return fromId;
    const email = String(t.email ?? "").trim();
    if (email) return `email:${email}`;
    return `row:${t.full_name}`;
}

/** ID exploitable pour les endpoints backend qui exigent un UUID strict (detail, watchdog talent). */
function talentActionId(t: TalentListItem): string | null {
    const tid = String(t.talent_id ?? "").trim();
    if (UUID_RE.test(tid)) return tid;
    const id = String(t.id ?? "").trim();
    if (UUID_RE.test(id)) return id;
    return null;
}

function topProject(t: TalentListItem) {
    return t.top_project;
}

function displayProjectName(t: TalentListItem): string | null {
    const n = topProject(t)?.name?.trim();
    if (n) return n;
    return t.primary_project_name?.trim() || null;
}

function displayProjectPriority(t: TalentListItem): number | null {
    const p = topProject(t)?.priority;
    if (p != null && Number.isFinite(p)) return p;
    return t.project_priority ?? null;
}

function displayProjectStatus(t: TalentListItem): string | null {
    return topProject(t)?.status?.trim() || t.project_status?.trim() || null;
}

function displayProjectDecision(t: TalentListItem): string | null {
    return topProject(t)?.decision?.trim() || t.latest_decision?.trim() || null;
}

function displayProjectMilestoneAt(t: TalentListItem): string | null {
    return topProject(t)?.milestone_at ?? t.project_milestone_at ?? null;
}

function sortToggle(current: SortKey, key: SortKey, dir: "asc" | "desc"): { key: SortKey; dir: "asc" | "desc" } {
    if (current !== key) {
        const defaultDir: "asc" | "desc" =
            key === "name" || key === "status" || key === "milestone" || key === "contract" || key === "decision" ? "asc" : "desc";
        return { key, dir: defaultDir };
    }
    return { key, dir: dir === "asc" ? "desc" : "asc" };
}

/** Priorité numérique 1–10 → pastille + libellé */
function priorityPresentation(p: number | null | undefined): { label: string; className: string } {
    if (p == null || !Number.isFinite(p)) return { label: "—", className: "border-secondary bg-secondary_subtle text-tertiary" };
    if (p <= 2) return { label: "Low", className: "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" };
    if (p <= 4) return { label: "Low", className: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200" };
    if (p <= 6) return { label: "Medium", className: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200" };
    if (p <= 8) return { label: "High", className: "border-orange-400 bg-orange-50 text-orange-900 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-200" };
    return { label: "Critical", className: "border-red-500 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/50 dark:text-red-200" };
}

function projectStatusBadge(status: string | null | undefined): { label: string; className: string } {
    const s = (status ?? "").toLowerCase().trim();
    if (!s) return { label: "—", className: "border-secondary bg-secondary_subtle text-tertiary" };
    if (s === "active")
        return { label: "active", className: "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200" };
    if (s === "on_hold")
        return { label: "on_hold", className: "border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100" };
    if (s === "cancelled")
        return { label: "cancelled", className: "border-red-400 bg-red-50 text-red-900 dark:border-red-600 dark:bg-red-950/50 dark:text-red-200" };
    if (s === "planned")
        return { label: "planned", className: "border-blue-400 bg-blue-50 text-blue-950 dark:border-blue-600 dark:bg-blue-950/50 dark:text-blue-200" };
    if (s === "completed")
        return { label: "completed", className: "border-violet-400 bg-violet-50 text-violet-950 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-200" };
    return {
        label: status ?? "—",
        className: "border-secondary bg-secondary_subtle text-secondary",
    };
}

function decisionBadge(decision: string | null | undefined): { label: string; className: string } {
    const d = (decision ?? "").toLowerCase().trim();
    if (!d) return { label: "—", className: "border-secondary bg-secondary_subtle text-tertiary" };
    if (d === "stop" || d === "reject")
        return { label: decision ?? "Stop", className: "border-red-500 bg-red-50 text-red-900 dark:border-red-600 dark:bg-red-950/50 dark:text-red-200" };
    if (d === "adjust")
        return { label: "Adjust", className: "border-amber-500 bg-amber-50 text-amber-950 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100" };
    if (d === "continue" || d === "proceed")
        return { label: decision ?? "Continue", className: "border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200" };
    return { label: decision ?? "—", className: "border-secondary bg-secondary_subtle text-secondary" };
}

function alertsCountPresentation(n: number): { className: string } {
    if (n > 0) return { className: "border-red-500 bg-red-50 font-semibold text-red-800 dark:border-red-600 dark:bg-red-950/50 dark:text-red-200" };
    return { className: "border-secondary bg-secondary_subtle text-tertiary" };
}

function parseAtMidnight(iso: string): number {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return NaN;
    return t;
}

function milestoneCell(milestoneAt: string | null | undefined) {
    if (!milestoneAt) {
        return <span className="text-tertiary">—</span>;
    }
    const d = new Date(milestoneAt);
    if (Number.isNaN(d.getTime())) return <span className="text-tertiary">—</span>;
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const late = dayEnd.getTime() < Date.now();
    const formatted = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    return (
        <div className="flex flex-col gap-0.5">
            <span className={late ? "font-medium text-red-600 dark:text-red-400" : "text-primary"}>{formatted}</span>
            {late ? (
                <span className="w-fit rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
                    En retard
                </span>
            ) : null}
        </div>
    );
}

function colorChip(statusColor: "green" | "orange" | "red"): string {
    if (statusColor === "red") return "bg-utility-error-50 text-utility-error-700 border-utility-error-200";
    if (statusColor === "orange") return "bg-utility-warning-50 text-utility-warning-700 border-utility-warning-200";
    return "bg-utility-success-50 text-utility-success-700 border-utility-success-200";
}

function statusLabel(statusColor: "green" | "orange" | "red"): string {
    if (statusColor === "red") return "Risque élevé";
    if (statusColor === "orange") return "Sous tension";
    return "Sain";
}

function ipiVisualColor(score: number): string {
    if (score >= 7) return "text-green-600";
    if (score >= 4) return "text-amber-600";
    return "text-red-600";
}

function ipiBandLabel(score: number): string {
    if (score < 4) return "A risque";
    if (score <= 7) return "OK";
    return "Top performer";
}

function loadBarTone(pct: number): { bar: string; text: string } {
    if (pct >= 130) return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
    if (pct >= 105) return { bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" };
    if (pct >= 90) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
    return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
}

function compareNullableNum(a: number | null | undefined, b: number | null | undefined, dir: "asc" | "desc"): number {
    const av = a ?? (dir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    const bv = b ?? (dir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    return dir === "asc" ? av - bv : bv - av;
}

function SortableTh({
    label,
    active,
    dir,
    onClick,
    align = "left",
}: {
    label: string;
    active: boolean;
    dir: "asc" | "desc";
    onClick: () => void;
    align?: "left" | "right";
}) {
    return (
        <th className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"}`}>
            <button
                type="button"
                onClick={onClick}
                className="group inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left text-xs font-semibold uppercase tracking-wide text-tertiary transition-colors hover:bg-secondary_subtle hover:text-primary"
            >
                <span>{label}</span>
                <span
                    className={`font-mono text-[10px] text-brand-secondary ${active ? "opacity-100" : "opacity-0 transition-opacity group-hover:opacity-100"}`}
                    aria-hidden
                >
                    {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
                </span>
            </button>
        </th>
    );
}

export default function TeamPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "allocation", dir: "desc" });
    const [contractEndingOnly, setContractEndingOnly] = useState(false);
    const [detailTalent, setDetailTalent] = useState<TalentListItem | null>(null);
    const { push } = useToast();
    const filterParam = searchParams.get("filter");
    const contractEndingParam = searchParams.get("contract_ending");
    const isOverloadedFilter = filterParam === "overloaded";
    const isContractEndingFilter = contractEndingParam === "1";

    const team = useTeam({
        scope: "mine",
        limit: 200,
        search: search.trim() || undefined,
        contract_ending: contractEndingOnly || undefined,
    });
    const watchdogScan = useWatchdogScan();

    const onHeaderSort = (key: SortKey) => {
        setSort((prev) => sortToggle(prev.key, key, prev.dir));
    };

    const onScanTalent = (talentId: string, label: string) => {
        watchdogScan.mutate(
            { talent_id: talentId, use_ai: true },
            {
                onSuccess: () => push(`Scan Watchdog lancé pour ${label}.`, "success"),
                onError: () => push("Impossible de lancer le scan Watchdog.", "error"),
            },
        );
    };

    const rows = useMemo(() => {
        let list = [...(team.data?.talents ?? [])];

        if (isOverloadedFilter) {
            list = list.filter((talent) => Number(talent.total_allocation_pct ?? 0) >= 100);
        }
        if (isContractEndingFilter) {
            const horizon = new Date();
            horizon.setDate(horizon.getDate() + 90);
            list = list.filter((talent) => {
                if (!talent.contract_end_date) return false;
                const endDate = new Date(talent.contract_end_date);
                return !Number.isNaN(endDate.getTime()) && endDate <= horizon;
            });
        }

        const { key, dir } = sort;
        const mul = dir === "asc" ? 1 : -1;

        list.sort((a, b) => {
            if (key === "name") return mul * a.full_name.localeCompare(b.full_name, "fr");
            if (key === "alerts") return mul * ((a.active_alerts_count ?? 0) - (b.active_alerts_count ?? 0));
            if (key === "priority") return mul * compareNullableNum(displayProjectPriority(a), displayProjectPriority(b), dir);
            if (key === "milestone") {
                const ma = displayProjectMilestoneAt(a);
                const mb = displayProjectMilestoneAt(b);
                const ta = ma ? parseAtMidnight(ma) : NaN;
                const tb = mb ? parseAtMidnight(mb) : NaN;
                const aVal = Number.isNaN(ta) ? (dir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : ta;
                const bVal = Number.isNaN(tb) ? (dir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : tb;
                return mul * (aVal - bVal);
            }
            if (key === "allocation") return mul * ((a.total_allocation_pct ?? 0) - (b.total_allocation_pct ?? 0));
            if (key === "ipi")
                return mul * compareNullableNum(a.insights?.ipi_score ?? null, b.insights?.ipi_score ?? null, dir);
            if (key === "contract") {
                const da = a.contract_end_date ?? "9999-12-31";
                const db = b.contract_end_date ?? "9999-12-31";
                return mul * da.localeCompare(db);
            }
            if (key === "status") {
                return mul * (a.project_status ?? "").localeCompare(b.project_status ?? "", "fr");
            }
            if (key === "decision") {
                return mul * (a.latest_decision ?? "").localeCompare(b.latest_decision ?? "", "fr");
            }
            return 0;
        });

        return list;
    }, [team.data?.talents, sort, isOverloadedFilter, isContractEndingFilter]);

    const kpis = useMemo(() => {
        const list = team.data?.talents ?? [];
        return {
            total: list.length,
            overloaded: list.filter((t) => Number(t.total_allocation_pct ?? 0) > 100 || Number(t.remaining_capacity_pct ?? 0) < 0).length,
            healthy: list.filter((t) => t.status_color === "green").length,
            contractEndingSoon: list.filter((t) => Boolean(t.contract_ending_soon)).length,
        };
    }, [team.data?.talents]);

    const activeSort = sort.key;
    const activeDir = sort.dir;

    return (
        <WorkspacePageShell role="manager" eyebrow="Manager" title="Mon équipe" description={false} omitHeader>
            <PageHero
                eyebrow="Talent Intelligence"
                title="Mon équipe"
                subtitle="Vue consolidée des talents managés, charges, contrats et alertes."
                badge="Manager"
            />
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <KpiCard label="Total équipe" value={kpis.total} color="blue" />
                <KpiCard label="Surchargés" value={kpis.overloaded} color="red" />
                <KpiCard label="Sains" value={kpis.healthy} color="green" />
                <KpiCard label="Contrat <90j" value={kpis.contractEndingSoon} color="orange" />
            </section>

            <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher nom ou email"
                        className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
                    />
                    <label className="flex items-center gap-2 rounded-lg border border-secondary px-3 py-2 text-sm">
                        <input
                            type="checkbox"
                            checked={contractEndingOnly || isContractEndingFilter}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setContractEndingOnly(checked);
                                const next = new URLSearchParams(searchParams);
                                if (checked) next.set("contract_ending", "1");
                                else next.delete("contract_ending");
                                setSearchParams(next);
                            }}
                        />
                        Contrat proche uniquement
                    </label>
                    <button
                        className={`rounded-lg border px-3 py-2 text-sm transition-all duration-200 hover:shadow-sm ${isOverloadedFilter ? "border-amber-300 bg-amber-50 text-amber-900" : "border-secondary"}`}
                        onClick={() => {
                            const next = new URLSearchParams(searchParams);
                            if (isOverloadedFilter) next.delete("filter");
                            else next.set("filter", "overloaded");
                            setSearchParams(next);
                        }}
                    >
                        {isOverloadedFilter ? "Retirer filtre surcharge" : "Filtrer surchargés"}
                    </button>
                    <button
                        className="rounded-lg border border-secondary px-3 py-2 text-sm transition-all duration-200 hover:shadow-sm disabled:opacity-60"
                        disabled={watchdogScan.isPending}
                        onClick={() =>
                            watchdogScan.mutate(
                                { use_ai: true },
                                {
                                    onSuccess: () => push("Scan Watchdog global lancé.", "success"),
                                    onError: () => push("Échec du scan Watchdog global.", "error"),
                                },
                            )
                        }
                    >
                        {watchdogScan.isPending ? "Scan en cours..." : "Lancer scan Watchdog global"}
                    </button>
                </div>
            </section>
            <section className="rounded-2xl border border-secondary bg-primary px-4 py-3 text-xs text-tertiary shadow-sm">
                <span className="font-medium text-primary">IPI</span> : indicateur interne (sur 10). Survole une valeur IPI pour voir le détail.
            </section>
            {(isOverloadedFilter || isContractEndingFilter) ? (
                <section className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-amber-900">
                            Filtre actif:
                            {isOverloadedFilter ? ` Talents surchargés (${rows.length})` : ""}
                            {isContractEndingFilter ? `${isOverloadedFilter ? " ·" : ""} Contrat finissant sous 90 jours (${rows.length})` : ""}
                        </span>
                        <button
                            className="ml-auto rounded border bg-white px-2 py-1 text-xs hover:bg-amber-100"
                            onClick={() => {
                                setContractEndingOnly(false);
                                setSearchParams({});
                            }}
                        >
                            Effacer
                        </button>
                    </div>
                </section>
            ) : null}

            {team.isLoading ? <p>Chargement de l&apos;équipe...</p> : null}

            <div className="rounded-2xl border border-secondary bg-primary shadow-sm">
                <table className="w-full table-fixed text-sm">
                    <thead className="border-b border-secondary bg-secondary_subtle/40 text-left">
                        <tr>
                            <SortableTh
                                label="Talent"
                                active={activeSort === "name"}
                                dir={activeDir}
                                onClick={() => onHeaderSort("name")}
                            />
                            <th className="w-[18%] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-tertiary">Projet</th>
                            <SortableTh
                                label="Statut"
                                active={activeSort === "status"}
                                dir={activeDir}
                                onClick={() => onHeaderSort("status")}
                            />
                            <th className="w-[16%] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-tertiary">Charge</th>
                            <SortableTh
                                label="IPI"
                                active={activeSort === "ipi"}
                                dir={activeDir}
                                onClick={() => onHeaderSort("ipi")}
                            />
                            <SortableTh
                                label="Fin contrat"
                                active={activeSort === "contract"}
                                dir={activeDir}
                                onClick={() => onHeaderSort("contract")}
                            />
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-tertiary">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((talent) => (
                            <TeamRow
                                key={talentStableId(talent)}
                                talent={talent}
                                actionTalentId={talentActionId(talent)}
                                onOpenDrawer={() => setDetailTalent(talent)}
                                onScan={
                                    talentActionId(talent)
                                        ? () => onScanTalent(talentActionId(talent) as string, talent.full_name)
                                        : undefined
                                }
                                scanPending={watchdogScan.isPending}
                            />
                        ))}
                        {!team.isLoading && rows.length === 0 ? (
                            <tr>
                                <td className="px-3 py-6 text-center text-tertiary" colSpan={7}>
                                    Aucun talent trouvé avec ces filtres.
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>

            <TalentDrawer
                talent={detailTalent}
                onClose={() => setDetailTalent(null)}
                onOpenFullProfile={(id) => navigate(`/workspace/manager/team/${id}`)}
                onScan={(id, label) => onScanTalent(id, label)}
                scanPending={watchdogScan.isPending}
            />
        </WorkspacePageShell>
    );
}

function TeamRow({
    talent,
    actionTalentId,
    onOpenDrawer,
    onScan,
    scanPending,
}: {
    talent: TalentListItem;
    actionTalentId: string | null;
    onOpenDrawer: () => void;
    onScan?: () => void;
    scanPending: boolean;
}) {
    const navigate = useNavigate();
    const rowId = talentStableId(talent);
    const st = projectStatusBadge(displayProjectStatus(talent));
    const projectLabel = displayProjectName(talent);
    const canOpenDetail = Boolean(actionTalentId);
    const missingEmail = !String(talent.email ?? "").trim();
    const alloc = clamp(Math.round(Number(talent.total_allocation_pct ?? 0)), 0, 200);
    const loadTone = loadBarTone(alloc);

    return (
        <tr className="border-t border-secondary transition-colors hover:bg-secondary_subtle/30">
            <td className="px-3 py-2">
                <button
                    type="button"
                    onClick={onOpenDrawer}
                    className="w-full text-left"
                    aria-label={`Ouvrir le détail — ${talent.full_name}`}
                >
                    <p className="truncate font-medium text-primary">{talent.full_name}</p>
                    <p className="truncate text-xs text-tertiary">{talent.email || "Email non renseigné"}</p>
                </button>
                {missingEmail ? (
                    <p className="mt-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">Profil incomplet: email manquant</p>
                ) : null}
                {talent.main_skills && talent.main_skills.length > 0 ? (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-tertiary">{talent.main_skills.slice(0, 3).join(" · ")}</p>
                ) : null}
            </td>
            <td className="px-3 py-2 text-xs">
                <span className="block truncate" title={projectLabel ?? undefined}>
                    {projectLabel ?? "—"}
                </span>
            </td>
            <td className="px-3 py-2">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${st.className}`}>{st.label}</span>
            </td>
            <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary_subtle" aria-hidden>
                        <div className={`h-full rounded-full ${loadTone.bar}`} style={{ width: `${clamp(alloc, 0, 160)}%` }} />
                    </div>
                    <span className={`w-12 shrink-0 text-right text-xs font-semibold tabular-nums ${loadTone.text}`}>{alloc}%</span>
                </div>
            </td>
            <td className="px-3 py-2 tabular-nums text-tertiary"><IpiBadge score={talent.insights?.ipi_score ?? null} /></td>
            <td className="px-3 py-2 text-xs tabular-nums">{talent.contract_end_date ? new Date(talent.contract_end_date).toLocaleDateString("fr-FR") : "—"}</td>
            <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        className="rounded-md bg-brand-secondary px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                        disabled={!canOpenDetail}
                        onClick={() => {
                            if (actionTalentId) navigate(`/workspace/manager/team/${actionTalentId}`);
                        }}
                    >
                        Détail
                    </button>
                    <button
                        type="button"
                        className="rounded-md border border-secondary px-2 py-1 text-xs hover:bg-secondary_subtle disabled:opacity-60"
                        disabled={scanPending || !onScan}
                        onClick={() => onScan?.()}
                    >
                        Watchdog
                    </button>
                    <span className="sr-only">Menu actions pour {talent.full_name}</span>
                    <Dropdown.Root>
                        <Dropdown.DotsButton aria-label={`Ouvrir le menu d'actions — ${talent.full_name}`} />
                        <Dropdown.Popover className="w-min">
                            <Dropdown.Menu>
                                <Dropdown.Item
                                    id={`${rowId}-detail`}
                                    textValue="Détail"
                                    icon={Eye}
                                    label="Détail du talent"
                                    onAction={() => {
                                        if (actionTalentId) navigate(`/workspace/manager/team/${actionTalentId}`);
                                    }}
                                    isDisabled={!actionTalentId}
                                />
                                <Dropdown.Item
                                    id={`${rowId}-watchdog`}
                                    textValue="Watchdog"
                                    label="Lancer scan Watchdog"
                                    onAction={() => onScan?.()}
                                    isDisabled={scanPending || !onScan}
                                />
                            </Dropdown.Menu>
                        </Dropdown.Popover>
                    </Dropdown.Root>
                </div>
            </td>
        </tr>
    );
}

function TalentDrawer({
    talent,
    onClose,
    onOpenFullProfile,
    onScan,
    scanPending,
}: {
    talent: TalentListItem | null;
    onClose: () => void;
    onOpenFullProfile: (talentId: string) => void;
    onScan: (talentId: string, label: string) => void;
    scanPending: boolean;
}) {
    if (!talent) return null;
    const actionId = talentActionId(talent);
    const pr = priorityPresentation(displayProjectPriority(talent));
    const st = projectStatusBadge(displayProjectStatus(talent));
    const dec = decisionBadge(displayProjectDecision(talent));
    const al = alertsCountPresentation(talent.active_alerts_count);
    const alloc = clamp(Math.round(Number(talent.total_allocation_pct ?? 0)), 0, 200);
    const remaining = Math.round(Number(talent.remaining_capacity_pct ?? 0));
    const projectLabel = displayProjectName(talent);

    return (
        <div className="fixed inset-0 z-50">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                aria-label="Fermer le détail talent"
            />
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-[28rem] flex-col overflow-hidden border-l border-secondary bg-primary shadow-2xl">
                <header className="sticky top-0 z-10 border-b border-secondary bg-primary/95 px-4 py-3 backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Détail talent</p>
                            <h3 className="truncate text-base font-semibold text-primary">{talent.full_name}</h3>
                            <p className="truncate text-xs text-tertiary">{talent.email || "Email non renseigné"}</p>
                        </div>
                        <button
                            type="button"
                            className="rounded-lg border border-secondary bg-primary_alt px-3 py-2 text-xs font-semibold text-secondary hover:bg-secondary_subtle"
                            onClick={onClose}
                        >
                            Fermer
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${pr.className}`}>
                            Priorité {pr.label}
                        </span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${st.className}`}>{st.label}</span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${dec.className}`}>{dec.label}</span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] tabular-nums ${al.className}`}>
                            Alertes {talent.active_alerts_count ?? 0}
                        </span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${colorChip(talent.status_color)}`}>{statusLabel(talent.status_color)}</span>
                    </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    <section className="rounded-xl border border-secondary bg-primary_alt p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">Projet principal</p>
                        <p className="mt-1 truncate text-sm font-medium text-primary">{projectLabel ?? "—"}</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                                <p className="text-[11px] font-medium text-tertiary">Jalon</p>
                                <div className="mt-1 text-sm text-secondary">{milestoneCell(displayProjectMilestoneAt(talent))}</div>
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-tertiary">Fin contrat</p>
                                <p className="mt-1 text-sm text-secondary">
                                    {talent.contract_end_date ? new Date(talent.contract_end_date).toLocaleDateString("fr-FR") : "—"}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-secondary bg-primary p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">Allocation</p>
                            <p className="mt-1 text-lg font-semibold tabular-nums text-primary">{alloc}%</p>
                        </div>
                        <div className="rounded-xl border border-secondary bg-primary p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">Capacité restante</p>
                            <p className="mt-1 text-lg font-semibold tabular-nums text-primary">{Number.isFinite(remaining) ? `${remaining}%` : "—"}</p>
                        </div>
                        <div className="rounded-xl border border-secondary bg-primary p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">IPI</p>
                            <p className="mt-1 text-sm text-secondary">
                                <IpiBadge score={talent.insights?.ipi_score ?? null} />
                            </p>
                        </div>
                        <div className="rounded-xl border border-secondary bg-primary p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">Email</p>
                            <p className="mt-1 truncate text-sm text-secondary">{talent.email || "—"}</p>
                        </div>
                    </section>

                    <section className="mt-4 rounded-xl border border-secondary bg-primary p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">Watchdog</p>
                        <p className="mt-1 text-sm text-secondary">
                            {talent.insights?.mobility_flag ? `Signal: ${talent.insights.mobility_flag}` : "Aucune recommandation Watchdog disponible sur cette vue."}
                        </p>
                    </section>
                </div>

                <footer className="border-t border-secondary bg-primary px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="rounded-lg border border-secondary bg-primary_alt px-3 py-2 text-xs font-semibold text-secondary hover:bg-secondary_subtle disabled:opacity-50"
                            disabled={!actionId}
                            onClick={() => actionId && onOpenFullProfile(actionId)}
                        >
                            Ouvrir profil complet
                        </button>
                        <button
                            type="button"
                            className="rounded-lg border border-secondary bg-primary_alt px-3 py-2 text-xs font-semibold text-secondary hover:bg-secondary_subtle disabled:opacity-50"
                            disabled={!actionId || scanPending}
                            onClick={() => actionId && onScan(actionId, talent.full_name)}
                        >
                            {scanPending ? "Scan en cours..." : "Lancer Watchdog"}
                        </button>
                    </div>
                </footer>
            </aside>
        </div>
    );
}

function IpiBadge({ score }: { score: number | null }) {
    if (score == null) return <span className="text-muted-foreground">—</span>;
    const filled = Math.max(0, Math.min(10, Math.round(score)));
    const color = ipiVisualColor(score);
    const tooltip = `Indice Performance Individuelle (1-10)\n< 4 = a risque, 4-7 = OK, > 7 = top performer`;
    return (
        <span title={tooltip} className={`inline-flex items-center gap-1.5 font-medium ${color}`}>
            <span>{score.toFixed(1)}</span>
            <span className="font-mono text-[10px] leading-none">
                {Array.from({ length: 10 }, (_, i) => (i < filled ? "●" : "○")).join("")}
            </span>
            <span className="text-[10px] uppercase">{ipiBandLabel(score)}</span>
        </span>
    );
}

function KpiCard({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: "blue" | "red" | "green" | "orange";
}) {
    const palette: Record<typeof color, string> = {
        blue: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100",
        red: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100",
        green: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-100",
        orange: "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100",
    };
    return (
        <article className={`rounded-2xl border px-4 py-4 shadow-sm ${palette[color]}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
        </article>
    );
}
