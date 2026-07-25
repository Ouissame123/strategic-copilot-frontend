/**
 * Dashboard Manager — v4_factual STRICT
 * Contrat: GET /webhook/manager/dashboard?scope=<mine|enterprise>
 * AUCUN champ agent — 100 % factuel. Pas d’appel orchestrator.
 */
import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
    Bar,
    BarChart,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import {
    useManagerDashboard,
    type DashboardData,
    type DashboardScope,
} from "../../hooks/useManagerDashboard";
import type {
    DashboardPortfolioByStatus,
    DashboardProjectRow,
    DashboardTasksFactual,
    DashboardTeamFactual,
} from "@/features/manager/types/dashboard-v4";
import { looksLikeUuidOrTechnicalId, stripTechnicalIdentifiers } from "@/lib/matchmaker-display";
import { formatCurrency } from "@/utils/format";
import { WORKSPACE_PREFIX, managerProjectMissionControlPath } from "@/utils/workspace-routes";
import { cx } from "@/utils/cx";

const STATUS_COLORS = {
    active: "#22c55e",
    planned: "#3b82f6",
    on_hold: "#f59e0b",
    completed: "#94a3b8",
} as const;

const LOAD_COLORS = {
    underloaded: "#60a5fa",
    balanced: "#22c55e",
    overloaded: "#ef4444",
} as const;

const TABLE_ID = "projects-table";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-slate-400";
const TOOLTIP = {
    fontSize: 12,
    borderRadius: 8,
    border: "1px solid #e2e8f0",
};

function projectDisplayName(name: string): string {
    if (looksLikeUuidOrTechnicalId(name)) return "Projet sans nom";
    const stripped = stripTechnicalIdentifiers(name).trim();
    if (!stripped || looksLikeUuidOrTechnicalId(stripped)) return "Projet sans nom";
    return stripped;
}

function OverdueBanner({ overdue, total }: { overdue: number; total: number }) {
    if (overdue > 0) {
        return (
            <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-4 dark:border-red-900/50 dark:bg-red-950/40"
            >
                <span className="text-lg font-semibold tracking-tight text-red-900 dark:text-red-100 sm:text-xl">
                    <span className="tabular-nums">{overdue}</span> projet{overdue > 1 ? "s" : ""} en retard sur{" "}
                    <span className="tabular-nums">{total}</span>
                </span>
                <a
                    href={`#${TABLE_ID}`}
                    className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                >
                    Voir la liste
                </a>
            </div>
        );
    }
    return (
        <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
        >
            Aucun projet en retard.
        </div>
    );
}

function TalentUtilizationCard({ team }: { team: DashboardTeamFactual }) {
    const pctAssigned = team.total_pool > 0 ? (team.assigned / team.total_pool) * 100 : 0;
    return (
        <section className="rounded-2xl border border-primary-100/80 bg-gradient-to-br from-primary-50 to-white p-5 shadow-sm dark:border-primary-900/40 dark:from-primary-950/30 dark:to-slate-950">
            <div className={LABEL}>Utilisation des talents</div>
            <div className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
                {team.assigned}{" "}
                <span className="text-xl font-medium text-slate-400 sm:text-2xl">
                    / {team.total_pool} talents affectés
                </span>
            </div>
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
                {team.unassigned} talents disponibles, sans affectation active
            </p>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full bg-[#3b82f6]" style={{ width: `${pctAssigned}%` }} />
                <div className="h-full bg-slate-200 dark:bg-slate-600" style={{ width: `${100 - pctAssigned}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#3b82f6]" aria-hidden />
                    Affectés ({team.assigned})
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-slate-200 dark:bg-slate-600" aria-hidden />
                    Disponibles ({team.unassigned})
                </span>
            </div>
        </section>
    );
}

function LoadRow({ label, value, color }: { label: string; value: number; color: string }) {
    const width = value > 0 ? Math.min(100, Math.max(value * 8, 6)) : 0;
    return (
        <div className="mt-2 flex items-center gap-2">
            <span className="w-24 shrink-0 text-[11px] text-slate-500">{label}</span>
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
            </div>
            <span className="w-6 text-right text-[11px] font-medium tabular-nums text-slate-700 dark:text-slate-300">
                {value}
            </span>
        </div>
    );
}

function KpiRow({ data }: { data: DashboardData }) {
    const { portfolio, team, tasks } = data;
    const taskTotal = Math.max(tasks.total, 1);
    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <div className={LABEL}>Projets</div>
                <div className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {portfolio.total_projects}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                        <span className="size-1.5 rounded-full" style={{ background: STATUS_COLORS.active }} aria-hidden />
                        {portfolio.by_status.active} actifs
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="size-1.5 rounded-full" style={{ background: STATUS_COLORS.planned }} aria-hidden />
                        {portfolio.by_status.planned} planifiés
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="size-1.5 rounded-full" style={{ background: STATUS_COLORS.on_hold }} aria-hidden />
                        {portfolio.by_status.on_hold} en pause
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span
                            className="size-1.5 rounded-full"
                            style={{ background: STATUS_COLORS.completed }}
                            aria-hidden
                        />
                        {portfolio.by_status.completed} terminés
                    </span>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <div className={LABEL}>Budget RH</div>
                <div className="mt-2 text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatCurrency(portfolio.budget.actual_total)}{" "}
                    <span className="text-sm font-medium text-slate-400">
                        / {formatCurrency(portfolio.budget.planned_total)}
                    </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                        className="h-full rounded-full bg-slate-600 dark:bg-slate-400"
                        style={{ width: `${Math.min(portfolio.budget.consumed_pct, 100)}%` }}
                    />
                </div>
                {portfolio.budget.consumed_pct < 10 && portfolio.budget.planned_total > 0 ? (
                    <p className="mt-2 text-[11px] leading-snug text-amber-800 dark:text-amber-200">
                        Consommation très faible ({portfolio.budget.consumed_pct} %) par rapport au budget
                        planifié — à vérifier
                    </p>
                ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <div className={LABEL}>Charge d&apos;équipe affectée</div>
                <div className="mt-0.5 text-[11px] text-slate-500">parmi les talents affectés</div>
                <LoadRow label="Sous-chargée" value={team.underloaded} color={LOAD_COLORS.underloaded} />
                <LoadRow label="Équilibrée" value={team.balanced} color={LOAD_COLORS.balanced} />
                <LoadRow label="Sur-allouée" value={team.overloaded} color={LOAD_COLORS.overloaded} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <div className={LABEL}>Tâches</div>
                <div className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {tasks.completion_pct}
                    <span className="text-xl text-slate-400"> %</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                    {tasks.done} / {tasks.total} terminées
                </div>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full bg-[#22c55e]" style={{ width: `${(tasks.done / taskTotal) * 100}%` }} />
                    <div
                        className="h-full bg-[#3b82f6]"
                        style={{ width: `${(tasks.in_progress / taskTotal) * 100}%` }}
                    />
                    <div
                        className="h-full bg-slate-200 dark:bg-slate-600"
                        style={{ width: `${(tasks.todo / taskTotal) * 100}%` }}
                    />
                </div>
                {/* tasks.critical volontairement absent — donnée peu fiable */}
            </div>
        </div>
    );
}

function ContractsEncart({ n }: { n: number }) {
    if (n === 0) return null;
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 border-l-4 border-l-amber-400 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <span className="text-slate-700 dark:text-slate-200">
                <strong className="tabular-nums">{n}</strong> contrat{n > 1 ? "s" : ""} se terminant sous 90 jours
            </span>
            <Link
                to={`${WORKSPACE_PREFIX.manager}/team`}
                className="font-medium text-slate-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:text-slate-200"
            >
                Voir Mon équipe →
            </Link>
        </div>
    );
}

function StatusDonut({ byStatus }: { byStatus: DashboardPortfolioByStatus }) {
    const data = [
        { name: "Actif", value: byStatus.active, color: STATUS_COLORS.active },
        { name: "Planifié", value: byStatus.planned, color: STATUS_COLORS.planned },
        { name: "En pause", value: byStatus.on_hold, color: STATUS_COLORS.on_hold },
        { name: "Terminé", value: byStatus.completed, color: STATUS_COLORS.completed },
    ];
    const total = data.reduce((s, d) => s + d.value, 0);
    return (
        <div className="relative h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} strokeWidth={0}>
                        {data.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} />
                </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{total}</span>
            </div>
        </div>
    );
}

function TeamLoadBars({ team }: { team: DashboardTeamFactual }) {
    const data = [
        { name: "Sous-chargée", value: team.underloaded, color: LOAD_COLORS.underloaded },
        { name: "Équilibrée", value: team.balanced, color: LOAD_COLORS.balanced },
        { name: "Sur-allouée", value: team.overloaded, color: LOAD_COLORS.overloaded },
    ];
    return (
        <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                    {data.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

function TasksProgressBar({ tasks }: { tasks: DashboardTasksFactual }) {
    const data = [{ name: "Tâches", done: tasks.done, in_progress: tasks.in_progress, todo: tasks.todo }];
    return (
        <ResponsiveContainer width="100%" height={100}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip
                    contentStyle={TOOLTIP}
                    formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                            done: "Terminées",
                            in_progress: "En cours",
                            todo: "À faire",
                        };
                        return [value, labels[name] ?? name];
                    }}
                />
                <Bar dataKey="done" stackId="a" fill="#22c55e" name="Terminées" radius={[6, 0, 0, 6]} />
                <Bar dataKey="in_progress" stackId="a" fill="#3b82f6" name="En cours" />
                <Bar dataKey="todo" stackId="a" fill="#e5e7eb" name="À faire" radius={[0, 6, 6, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

function ProjectsTable({
    projects,
    onSelect,
}: {
    projects: DashboardProjectRow[];
    onSelect: (id: string) => void;
}) {
    return (
        <div
            id={TABLE_ID}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950"
        >
            <table className="w-full table-fixed border-collapse text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/95 dark:border-slate-700 dark:bg-slate-900/95">
                    <tr>
                        {["Nom", "Priorité", "Équipe / Charge", "Échéance"].map((h) => (
                            <th
                                key={h}
                                className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {projects.map((p) => {
                        const overdue = p.deadline_urgency === "overdue";
                        return (
                            <tr
                                key={p.id}
                                onClick={() => onSelect(p.id)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        onSelect(p.id);
                                    }
                                }}
                                tabIndex={0}
                                role="link"
                                className={cx(
                                    "cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-400 dark:border-slate-800 dark:hover:bg-slate-900/50",
                                    overdue && "bg-red-50/80 dark:bg-red-950/30",
                                )}
                            >
                                <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                                    <span className="line-clamp-1">{projectDisplayName(p.name)}</span>
                                    {p.status_label ? (
                                        <span className="mt-0.5 block text-[10px] font-normal text-slate-500 dark:text-slate-400">
                                            {p.status_label}
                                        </span>
                                    ) : null}
                                </td>
                                <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-300">
                                    P{p.priority}
                                </td>
                                <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                                    {p.team_size} talent{p.team_size > 1 ? "s" : ""}
                                    {p.capacity_load_pct != null ? (
                                        <span
                                            className={cx(
                                                "ml-1 tabular-nums",
                                                p.capacity_load_pct > 100
                                                    ? "font-semibold text-red-600 dark:text-red-400"
                                                    : "text-slate-500 dark:text-slate-400",
                                            )}
                                        >
                                            · {Math.round(p.capacity_load_pct)} %
                                        </span>
                                    ) : null}
                                </td>
                                <td className="px-3 py-2.5">
                                    {p.deadline_urgency === "overdue" ? (
                                        <span className="inline-flex rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/40 dark:text-red-300">
                                            En retard
                                        </span>
                                    ) : null}
                                    {p.deadline_urgency === "urgent" ? (
                                        <span className="inline-flex rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200">
                                            Urgent
                                        </span>
                                    ) : null}
                                    {p.deadline_urgency === "warning" ? (
                                        <span className="inline-flex rounded-md bg-yellow-50 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-800 ring-1 ring-inset ring-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-200">
                                            Bientôt
                                        </span>
                                    ) : null}
                                    {p.deadline_urgency === "ok" ? (
                                        <span className="inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300">
                                            Dans les temps
                                        </span>
                                    ) : null}
                                    {p.deadline_urgency === "none" || p.deadline_urgency == null ? (
                                        <span className="text-slate-400">—</span>
                                    ) : null}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-4 p-4 sm:p-6" aria-busy aria-label="Chargement du portefeuille">
            <div className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" />
            <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
                ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
                ))}
            </div>
            <div className="h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
        </div>
    );
}

export function ManagerDashboardPage() {
    const { user } = useAuth();
    const isRh = user?.role === "rh";
    const [scope, setScope] = useState<DashboardScope>(isRh ? "enterprise" : "mine");
    const { data, loading, refreshing, error, refresh } = useManagerDashboard(isRh ? scope : "mine");
    const navigate = useNavigate();

    const load = useCallback(() => {
        void refresh();
    }, [refresh]);

    if (loading && !data) return <DashboardSkeleton />;

    if (error && !data) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center dark:border-red-900/40 dark:bg-red-950/30">
                    <p className="mb-3 text-sm text-red-800 dark:text-red-200">
                        Impossible de charger le dashboard : {error}
                    </p>
                    <button
                        type="button"
                        onClick={load}
                        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
                    >
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className={cx("mx-auto w-full max-w-[1440px] space-y-4 px-4 py-4 sm:px-6", refreshing && "opacity-90")}>
            {isRh ? (
                <div className="flex justify-end">
                    <div
                        className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900"
                        role="group"
                        aria-label="Périmètre du portefeuille"
                    >
                        {(
                            [
                                { id: "mine" as const, label: "Mes projets" },
                                { id: "enterprise" as const, label: "Entreprise" },
                            ] as const
                        ).map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setScope(opt.id)}
                                aria-pressed={scope === opt.id}
                                className={cx(
                                    "rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
                                    scope === opt.id
                                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            <OverdueBanner
                overdue={data.portfolio.deadlines.overdue}
                total={data.portfolio.total_projects}
            />

            {data.portfolio.total_projects === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        Aucun projet dans votre portefeuille
                    </p>
                </div>
            ) : (
                <>
                    <TalentUtilizationCard team={data.team} />
                    <KpiRow data={data} />
                    <ContractsEncart n={data.team.contracts_ending_90d} />

                    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                            <div className={LABEL}>Projets par statut</div>
                            <StatusDonut byStatus={data.portfolio.by_status} />
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                            <div className={LABEL}>Talents affectés vs disponibles</div>
                            <ResponsiveContainer width="100%" height={80}>
                                <BarChart
                                    data={[
                                        {
                                            name: "Talents",
                                            assigned: data.team.assigned,
                                            unassigned: data.team.unassigned,
                                        },
                                    ]}
                                    layout="vertical"
                                    margin={{ left: 0, right: 0 }}
                                >
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" hide />
                                    <Tooltip contentStyle={TOOLTIP} />
                                    <Bar
                                        dataKey="assigned"
                                        stackId="a"
                                        fill="#3b82f6"
                                        name="Affectés"
                                        radius={[6, 0, 0, 6]}
                                    />
                                    <Bar
                                        dataKey="unassigned"
                                        stackId="a"
                                        fill="#e5e7eb"
                                        name="Disponibles"
                                        radius={[0, 6, 6, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                            <div className={LABEL}>Charge d&apos;équipe affectée</div>
                            <TeamLoadBars team={data.team} />
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                            <div className={LABEL}>Avancement des tâches</div>
                            <TasksProgressBar tasks={data.tasks} />
                        </div>
                    </div>

                    <ProjectsTable
                        projects={data.projects}
                        onSelect={(id) => navigate(managerProjectMissionControlPath(id))}
                    />
                </>
            )}
        </div>
    );
}
