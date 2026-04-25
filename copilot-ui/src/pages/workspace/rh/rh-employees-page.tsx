import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Table, TableCard } from "@/components/application/table/table";
import { Button } from "@/components/base/buttons/button";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";
import { useTalentsWebhookList } from "@/hooks/use-talents-webhook-list";
import { pickCell } from "@/utils/rh-api-parse";
import { ErrorState } from "@/components/ui/ErrorState";
import { asRecord, firstArray, firstScalar, unwrapDataPayload } from "@/utils/unwrap-api-payload";

type PriorityLevel = "critical" | "watch" | "ok";
type RiskLevel = "critical" | "high" | "medium" | "low" | "unknown";

type EmployeeRow = Record<string, unknown> & {
    id: string;
    talent_id: string;
    name: string;
    role: string;
    email: string | null;
    team: string | null;
    skills: string[];
    availabilityPct: number | null;
    loadPct: number | null;
    projectsCount: number | null;
    rhStatus: string | null;
    reallocatable: boolean | null;
    risk: RiskLevel;
    alertsCount: number | null;
    insight: string | null;
    priority: PriorityLevel;
};

function toText(v: unknown): string | null {
    if (v == null) return null;
    const s = String(v).trim();
    return s ? s : null;
}

function toNumber(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
        const normalized = v.replace("%", "").trim();
        if (!normalized) return null;
        const n = Number(normalized);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function toStringArray(v: unknown): string[] {
    if (Array.isArray(v)) {
        return v.map((x) => toText(x)).filter((x): x is string => Boolean(x));
    }
    const t = toText(v);
    if (!t) return [];
    return t.split(",").map((x) => x.trim()).filter(Boolean);
}

function deriveRisk(rawRisk: unknown, loadPct: number | null, alertsCount: number | null): RiskLevel {
    const r = toText(rawRisk)?.toLowerCase();
    if (r === "critical" || r === "high" || r === "medium" || r === "low") return r;
    if ((alertsCount ?? 0) > 2 || (loadPct ?? 0) >= 95) return "critical";
    if ((alertsCount ?? 0) > 0 || (loadPct ?? 0) >= 85) return "high";
    if ((loadPct ?? 0) >= 70) return "medium";
    if (loadPct != null) return "low";
    return "unknown";
}

function derivePriority(loadPct: number | null, availabilityPct: number | null, risk: RiskLevel): PriorityLevel {
    if (risk === "critical" || (loadPct ?? 0) >= 95 || (availabilityPct ?? 100) <= 10) return "critical";
    if (risk === "high" || (loadPct ?? 0) >= 80 || (availabilityPct ?? 100) <= 25) return "watch";
    return "ok";
}

function scorePriority(priority: PriorityLevel): number {
    if (priority === "critical") return 3;
    if (priority === "watch") return 2;
    return 1;
}

function scoreRisk(risk: RiskLevel): number {
    if (risk === "critical") return 4;
    if (risk === "high") return 3;
    if (risk === "medium") return 2;
    if (risk === "low") return 1;
    return 0;
}

function pctTone(value: number | null, type: "availability" | "load"): string {
    if (value == null) return "bg-secondary";
    if (type === "availability") {
        if (value <= 10) return "bg-error-primary";
        if (value <= 25) return "bg-warning-primary";
        return "bg-success-primary";
    }
    if (value >= 95) return "bg-error-primary";
    if (value >= 80) return "bg-warning-primary";
    return "bg-success-primary";
}

function pctLabel(value: number | null): string {
    if (value == null) return "Non disponible";
    return `${Math.round(value)}%`;
}

export default function RhEmployeesPage() {
    const { t } = useTranslation(["common", "nav"]);
    const paths = useWorkspacePaths();
    useCopilotPage("staffing", t("nav:rhNavEmployees"));

    const { items, total, raw, loading, error, refresh } = useTalentsWebhookList();
    const [query, setQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [riskFilter, setRiskFilter] = useState("all");
    const [availabilityFilter, setAvailabilityFilter] = useState("all");
    const [loadFilter, setLoadFilter] = useState("all");
    const [reallocFilter, setReallocFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("priority");
    const [selectedTalentId, setSelectedTalentId] = useState<string | null>(null);

    const parsedRoot = useMemo(() => unwrapDataPayload(raw ?? {}), [raw]);
    const aiSummary = useMemo(() => {
        const copilot = asRecord(firstScalar(parsedRoot, ["copilot", "analysis", "ai_analysis", "insights"]));
        const recommendations = firstArray(copilot, ["recommendations_text", "recommendations"]);
        return {
            summary: toText(firstScalar(copilot, ["summary", "title"])) ?? toText(firstScalar(parsedRoot, ["summary", "ai_summary"])),
            explanation:
                toText(firstScalar(copilot, ["explanation", "details"])) ??
                toText(firstScalar(parsedRoot, ["explanation", "ai_explanation"])),
            recommendations: recommendations
                .map((item) => toText(item))
                .filter((item): item is string => Boolean(item))
                .slice(0, 3),
        };
    }, [parsedRoot]);

    const rows = useMemo<EmployeeRow[]>(() => {
        return items.map((r, index) => {
            const skills = toStringArray(r.skills ?? r.skills_summary ?? r.main_skills);
            const availabilityPct = toNumber(r.availability_pct ?? r.availability);
            const loadPct = toNumber(r.capacity_load_pct ?? r.workload_pct ?? r.load_pct ?? r.current_load_pct);
            const projectsCount = toNumber(r.assigned_projects_count ?? r.projects_count ?? r.projects_total);
            const alertsCount = toNumber(r.alerts_count ?? r.risk_alerts_count);
            const risk = deriveRisk(r.risk_level ?? r.risk_status ?? r.risk, loadPct, alertsCount);
            const priority = derivePriority(loadPct, availabilityPct, risk);
            return {
                ...r,
                id: String(r.talent_id ?? r.id ?? `talent-${index}`),
                talent_id: String(r.talent_id ?? r.id ?? `talent-${index}`),
                name: toText(r.name ?? r.full_name) ?? "Talent sans nom",
                role: toText(r.role ?? r.job_title) ?? "Rôle non disponible",
                email: toText(r.email),
                team: toText(r.team_name ?? r.team ?? r.department),
                skills,
                availabilityPct,
                loadPct,
                projectsCount,
                rhStatus: toText(r.rh_status ?? r.capacity_status ?? r.status),
                reallocatable:
                    typeof r.reallocatable === "boolean"
                        ? r.reallocatable
                        : typeof r.is_reallocatable === "boolean"
                          ? r.is_reallocatable
                          : null,
                risk,
                alertsCount,
                insight: toText(
                    r.recommendation_summary ?? r.ai_insight ?? r.mobility_hint ?? r.staffing_recommendation ?? r.insight,
                ),
                priority,
            };
        });
    }, [items]);

    const filteredRows = useMemo(() => {
        const q = query.trim().toLowerCase();
        const data = rows.filter((row) => {
            const matchesQuery =
                !q ||
                row.name.toLowerCase().includes(q) ||
                row.role.toLowerCase().includes(q) ||
                row.skills.join(" ").toLowerCase().includes(q);
            const matchesPriority = priorityFilter === "all" || row.priority === priorityFilter;
            const matchesRisk = riskFilter === "all" || row.risk === riskFilter;
            const matchesRealloc =
                reallocFilter === "all" ||
                (reallocFilter === "yes" && row.reallocatable === true) ||
                (reallocFilter === "no" && row.reallocatable === false);
            const matchesStatus = statusFilter === "all" || (row.rhStatus ?? "").toLowerCase() === statusFilter;
            const matchesAvailability =
                availabilityFilter === "all" ||
                (availabilityFilter === "low" && (row.availabilityPct ?? 101) <= 25) ||
                (availabilityFilter === "medium" && (row.availabilityPct ?? -1) > 25 && (row.availabilityPct ?? -1) <= 60) ||
                (availabilityFilter === "high" && (row.availabilityPct ?? -1) > 60);
            const matchesLoad =
                loadFilter === "all" ||
                (loadFilter === "low" && (row.loadPct ?? 101) < 50) ||
                (loadFilter === "normal" && (row.loadPct ?? -1) >= 50 && (row.loadPct ?? -1) < 80) ||
                (loadFilter === "high" && (row.loadPct ?? -1) >= 80 && (row.loadPct ?? -1) < 95) ||
                (loadFilter === "critical" && (row.loadPct ?? -1) >= 95);
            return (
                matchesQuery &&
                matchesPriority &&
                matchesRisk &&
                matchesAvailability &&
                matchesLoad &&
                matchesRealloc &&
                matchesStatus
            );
        });
        data.sort((a, b) => {
            if (sortBy === "priority") return scorePriority(b.priority) - scorePriority(a.priority);
            if (sortBy === "load") return (b.loadPct ?? -1) - (a.loadPct ?? -1);
            if (sortBy === "availability") return (a.availabilityPct ?? 999) - (b.availabilityPct ?? 999);
            if (sortBy === "risk") return scoreRisk(b.risk) - scoreRisk(a.risk);
            return a.name.localeCompare(b.name);
        });
        return data;
    }, [rows, query, priorityFilter, riskFilter, availabilityFilter, loadFilter, reallocFilter, statusFilter, sortBy]);

    const selectedTalent = useMemo(() => filteredRows.find((r) => r.id === selectedTalentId) ?? null, [filteredRows, selectedTalentId]);

    const kpis = useMemo(() => {
        const availabilityValues = rows.map((r) => r.availabilityPct).filter((v): v is number => v != null);
        const loadValues = rows.map((r) => r.loadPct).filter((v): v is number => v != null);
        const avgAvailability = availabilityValues.length
            ? Math.round(availabilityValues.reduce((sum, n) => sum + n, 0) / availabilityValues.length)
            : null;
        const avgLoad = loadValues.length ? Math.round(loadValues.reduce((sum, n) => sum + n, 0) / loadValues.length) : null;
        const fromBackend = (keys: string[]) => toNumber(firstScalar(parsedRoot, keys));
        return [
            { key: "total", label: "Total talents", value: fromBackend(["total_talents"]) ?? total ?? rows.length },
            {
                key: "overloaded",
                label: "Surchargés",
                value: fromBackend(["overloaded_talents"]) ?? rows.filter((r) => (r.loadPct ?? 0) >= 95).length,
            },
            {
                key: "underutilized",
                label: "Sous-utilisés",
                value: fromBackend(["underutilized_talents"]) ?? rows.filter((r) => (r.loadPct ?? 100) < 50).length,
            },
            {
                key: "highrisk",
                label: "Risque élevé",
                value: fromBackend(["high_risk_talents"]) ?? rows.filter((r) => r.risk === "high" || r.risk === "critical").length,
            },
            {
                key: "realloc",
                label: "Réaffectables",
                value: fromBackend(["reallocatable_talents"]) ?? rows.filter((r) => r.reallocatable === true).length,
            },
            { key: "availability", label: "Disponibilité moy.", value: fromBackend(["average_availability"]) ?? avgAvailability, suffix: "%" },
            { key: "load", label: "Charge moyenne", value: fromBackend(["average_capacity_load"]) ?? avgLoad, suffix: "%" },
        ];
    }, [parsedRoot, rows, total]);

    const uniqueStatus = useMemo(
        () =>
            Array.from(new Set(rows.map((r) => (r.rhStatus ?? "").trim()).filter(Boolean))).map((s) => ({
                label: s,
                value: s.toLowerCase(),
            })),
        [rows],
    );

    const renderPriority = (priority: PriorityLevel) => {
        const map: Record<PriorityLevel, string> = {
            critical: "bg-error-secondary text-error-primary",
            watch: "bg-warning-secondary text-warning-primary",
            ok: "bg-success-secondary text-success-primary",
        };
        const label: Record<PriorityLevel, string> = {
            critical: "Critique",
            watch: "Surveillance",
            ok: "OK",
        };
        return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${map[priority]}`}>{label[priority]}</span>;
    };

    const renderRisk = (risk: RiskLevel, alertsCount: number | null) => {
        const tone: Record<RiskLevel, string> = {
            critical: "bg-error-secondary text-error-primary",
            high: "bg-warning-secondary text-warning-primary",
            medium: "bg-brand-secondary text-brand-primary",
            low: "bg-success-secondary text-success-primary",
            unknown: "bg-secondary text-tertiary",
        };
        const label = risk === "unknown" ? "Non disponible" : risk;
        return (
            <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${tone[risk]}`}>{label}</span>
                {alertsCount != null ? <span className="text-xs text-tertiary">{alertsCount} alerte(s)</span> : null}
            </div>
        );
    };

    const FilterSelect = ({
        value,
        onChange,
        options,
        label,
    }: {
        value: string;
        onChange: (next: string) => void;
        options: Array<{ value: string; label: string }>;
        label: string;
    }) => (
        <label className="min-w-[150px] text-xs font-medium text-tertiary">
            <span className="mb-1 block">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 w-full rounded-lg border border-secondary bg-primary px-3 text-sm text-primary outline-none ring-0 focus:border-brand-secondary"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </label>
    );

    return (
        <WorkspacePageShell
            role="rh"
            eyebrow="RH"
            title={t("nav:rhNavEmployees")}
            description="Pilotez la disponibilité, la charge et les risques talents pour accélérer les décisions RH."
        >
            <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                        <div className="inline-flex rounded-full bg-brand-secondary px-2 py-1 text-xs font-semibold text-brand-primary">RH</div>
                        <p className="text-sm text-secondary">
                            Vision immédiate des surcharges, talents réaffectables et alertes pour décider plus vite.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button color="secondary" size="sm" onClick={() => void refresh()}>
                            {t("common:retry")}
                        </Button>
                        <Button color="primary" size="sm" href="/workspace/rh/mobility">
                            {t("common:rhEmployees.openMobility")}
                        </Button>
                        <Button color="secondary" size="sm" href="/workspace/rh/org-alerts">
                            Analyser les risques
                        </Button>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                <h2 className="text-sm font-semibold text-primary">Copilot RH</h2>
                {aiSummary.summary || aiSummary.explanation || aiSummary.recommendations.length ? (
                    <div className="mt-3 space-y-2">
                        {aiSummary.summary ? <p className="text-sm font-medium text-primary">{aiSummary.summary}</p> : null}
                        {aiSummary.explanation ? <p className="text-sm text-secondary">{aiSummary.explanation}</p> : null}
                        {aiSummary.recommendations.length ? (
                            <ul className="space-y-1 text-sm text-secondary">
                                {aiSummary.recommendations.map((line, idx) => (
                                    <li key={`rec-${idx}`} className="rounded-lg bg-secondary/40 px-3 py-2">
                                        {line}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                ) : (
                    <p className="mt-3 text-sm text-tertiary">
                        Analyse IA non disponible sur ce flux pour le moment. Les décisions restent pilotables via les KPI et la table.
                    </p>
                )}
            </section>

            {loading ? (
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={`kpi-skeleton-${i}`} className="h-24 animate-pulse rounded-2xl border border-secondary bg-secondary/40" />
                    ))}
                </section>
            ) : null}

            {!loading ? (
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {kpis.map((kpi) => (
                        <article key={kpi.key} className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80">
                            <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{kpi.label}</p>
                            <p className="mt-2 text-display-xs font-semibold text-primary">
                                {kpi.value != null ? `${kpi.value}${kpi.suffix ?? ""}` : "Non disponible"}
                            </p>
                        </article>
                    ))}
                </section>
            ) : null}

            {error ? (
                <ErrorState
                    title="Impossible de charger les talents"
                    message={error}
                    hint="Vérifiez le workflow talents et le proxy API, puis relancez."
                    onRetry={() => void refresh()}
                    retryLabel={t("common:retry")}
                    className="rounded-2xl border border-secondary bg-primary p-4"
                />
            ) : null}

            {!loading && !error ? (
                <section className="space-y-4">
                    <div className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80">
                        <div className="flex flex-wrap items-end gap-3">
                            <label className="min-w-[220px] flex-1 text-xs font-medium text-tertiary">
                                <span className="mb-1 block">Recherche</span>
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Nom, rôle, compétence"
                                    className="h-9 w-full rounded-lg border border-secondary bg-primary px-3 text-sm text-primary outline-none focus:border-brand-secondary"
                                />
                            </label>
                            <FilterSelect
                                label="Priorité"
                                value={priorityFilter}
                                onChange={setPriorityFilter}
                                options={[
                                    { value: "all", label: "Toutes" },
                                    { value: "critical", label: "Critique" },
                                    { value: "watch", label: "Surveillance" },
                                    { value: "ok", label: "OK" },
                                ]}
                            />
                            <FilterSelect
                                label="Risque"
                                value={riskFilter}
                                onChange={setRiskFilter}
                                options={[
                                    { value: "all", label: "Tous" },
                                    { value: "critical", label: "Critical" },
                                    { value: "high", label: "High" },
                                    { value: "medium", label: "Medium" },
                                    { value: "low", label: "Low" },
                                ]}
                            />
                            <FilterSelect
                                label="Disponibilité"
                                value={availabilityFilter}
                                onChange={setAvailabilityFilter}
                                options={[
                                    { value: "all", label: "Toutes" },
                                    { value: "low", label: "Faible" },
                                    { value: "medium", label: "Moyenne" },
                                    { value: "high", label: "Élevée" },
                                ]}
                            />
                            <FilterSelect
                                label="Charge"
                                value={loadFilter}
                                onChange={setLoadFilter}
                                options={[
                                    { value: "all", label: "Toutes" },
                                    { value: "low", label: "Faible" },
                                    { value: "normal", label: "Normale" },
                                    { value: "high", label: "Élevée" },
                                    { value: "critical", label: "Critique" },
                                ]}
                            />
                            <FilterSelect
                                label="Réaffectable"
                                value={reallocFilter}
                                onChange={setReallocFilter}
                                options={[
                                    { value: "all", label: "Tous" },
                                    { value: "yes", label: "Oui" },
                                    { value: "no", label: "Non" },
                                ]}
                            />
                            <FilterSelect
                                label="Statut RH"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={[{ value: "all", label: "Tous" }, ...uniqueStatus]}
                            />
                            <FilterSelect
                                label="Tri"
                                value={sortBy}
                                onChange={setSortBy}
                                options={[
                                    { value: "priority", label: "Priorité" },
                                    { value: "load", label: "Charge" },
                                    { value: "availability", label: "Disponibilité" },
                                    { value: "risk", label: "Risque" },
                                    { value: "name", label: "Nom" },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <TableCard.Root size="md">
                            <TableCard.Header
                                title={t("common:rhEmployees.tableTitle")}
                                description={`${filteredRows.length} talent(s) visibles sur ${rows.length}.`}
                            />
                            <Table
                                aria-label="Employés et talents RH"
                                className="min-w-[1280px]"
                                onRowAction={(key) => setSelectedTalentId(String(key))}
                            >
                                <Table.Header>
                                    <Table.Head id="priority" label="Priorité" />
                                    <Table.Head id="name" label={t("common:rhEmployees.colName")} isRowHeader />
                                    <Table.Head id="role" label={t("common:rhEmployees.colRole")} />
                                    <Table.Head id="skills" label={t("common:rhEmployees.colSkills")} />
                                    <Table.Head id="availability" label="Disponibilité" />
                                    <Table.Head id="load" label="Charge" />
                                    <Table.Head id="projects" label={t("common:rhEmployees.colProjects")} />
                                    <Table.Head id="risk" label="Risque" />
                                    <Table.Head id="insight" label="Insight IA" />
                                    <Table.Head id="actions" label="Actions" />
                                </Table.Header>
                                <Table.Body items={filteredRows}>
                                    {(row) => (
                                        <Table.Row id={row.id}>
                                            <Table.Cell>{renderPriority(row.priority)}</Table.Cell>
                                            <Table.Cell className="font-medium text-primary">
                                                <div>{row.name}</div>
                                                <div className="text-xs text-tertiary">{row.email ?? row.team ?? "Information non disponible"}</div>
                                            </Table.Cell>
                                            <Table.Cell>{row.role}</Table.Cell>
                                            <Table.Cell>
                                                {row.skills.length ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {row.skills.slice(0, 4).map((skill) => (
                                                            <span key={skill} className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {row.skills.length > 4 ? (
                                                            <span className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary">+{row.skills.length - 4}</span>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-tertiary">Non disponible</span>
                                                )}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <div className="space-y-1">
                                                    <div className="text-sm tabular-nums text-primary">{pctLabel(row.availabilityPct)}</div>
                                                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                                                        <div
                                                            className={`h-full ${pctTone(row.availabilityPct, "availability")}`}
                                                            style={{ width: `${Math.max(0, Math.min(100, row.availabilityPct ?? 0))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <div className="space-y-1">
                                                    <div className="text-sm tabular-nums text-primary">{pctLabel(row.loadPct)}</div>
                                                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                                                        <div
                                                            className={`h-full ${pctTone(row.loadPct, "load")}`}
                                                            style={{ width: `${Math.max(0, Math.min(100, row.loadPct ?? 0))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell className="tabular-nums">{row.projectsCount ?? "Non disponible"}</Table.Cell>
                                            <Table.Cell>{renderRisk(row.risk, row.alertsCount)}</Table.Cell>
                                            <Table.Cell className="max-w-xs truncate">{row.insight ?? "Non disponible"}</Table.Cell>
                                            <Table.Cell className="space-x-2 whitespace-nowrap">
                                                <Button size="sm" color="secondary" href={`${paths.profile}?talent=${encodeURIComponent(row.talent_id)}`}>
                                                    Voir profil
                                                </Button>
                                                <Button size="sm" color="secondary" href={`/workspace/rh/mobility?talent=${encodeURIComponent(row.talent_id)}`}>
                                                    Réaffecter
                                                </Button>
                                                <Button size="sm" color="secondary" onClick={() => setSelectedTalentId(row.id)}>
                                                    Analyser
                                                </Button>
                                                <Button size="sm" color="secondary" href="/workspace/rh/org-alerts">
                                                    Voir risques
                                                </Button>
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table>
                        </TableCard.Root>

                        <aside className="rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-primary">Détail talent</h3>
                                {selectedTalent ? (
                                    <Button size="sm" color="secondary" onClick={() => setSelectedTalentId(null)}>
                                        Fermer
                                    </Button>
                                ) : null}
                            </div>
                            {selectedTalent ? (
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <p className="text-base font-semibold text-primary">{selectedTalent.name}</p>
                                        <p className="text-tertiary">{selectedTalent.role}</p>
                                    </div>
                                    <p className="text-secondary">{selectedTalent.email ?? selectedTalent.team ?? "Contact non disponible"}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-lg bg-secondary/50 p-2">
                                            <p className="text-xs text-quaternary">Disponibilité</p>
                                            <p className="font-semibold text-primary">{pctLabel(selectedTalent.availabilityPct)}</p>
                                        </div>
                                        <div className="rounded-lg bg-secondary/50 p-2">
                                            <p className="text-xs text-quaternary">Charge</p>
                                            <p className="font-semibold text-primary">{pctLabel(selectedTalent.loadPct)}</p>
                                        </div>
                                        <div className="rounded-lg bg-secondary/50 p-2">
                                            <p className="text-xs text-quaternary">Projets</p>
                                            <p className="font-semibold text-primary">{selectedTalent.projectsCount ?? "Non disponible"}</p>
                                        </div>
                                        <div className="rounded-lg bg-secondary/50 p-2">
                                            <p className="text-xs text-quaternary">Statut RH</p>
                                            <p className="font-semibold text-primary">{selectedTalent.rhStatus ?? "Non disponible"}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="mb-1 text-xs text-quaternary">Compétences</p>
                                        {selectedTalent.skills.length ? (
                                            <div className="flex flex-wrap gap-1">
                                                {selectedTalent.skills.map((skill) => (
                                                    <span key={skill} className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-tertiary">Non disponible</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="mb-1 text-xs text-quaternary">Risque & alertes</p>
                                        {renderRisk(selectedTalent.risk, selectedTalent.alertsCount)}
                                    </div>
                                    <div>
                                        <p className="mb-1 text-xs text-quaternary">Résumé IA</p>
                                        <p className="text-secondary">{selectedTalent.insight ?? "Non disponible"}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" color="secondary" href={`${paths.profile}?talent=${encodeURIComponent(selectedTalent.talent_id)}`}>
                                            Voir profil
                                        </Button>
                                        <Button size="sm" color="primary" href={`/workspace/rh/mobility?talent=${encodeURIComponent(selectedTalent.talent_id)}`}>
                                            Réaffecter
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-tertiary">
                                    Sélectionnez un talent dans la table pour afficher son panneau de décision RH.
                                </p>
                            )}
                        </aside>
                    </div>

                    {filteredRows.length === 0 ? (
                        <div className="rounded-2xl border border-secondary bg-primary p-6 text-sm text-tertiary shadow-xs ring-1 ring-secondary/80">
                            Aucun talent ne correspond aux filtres actuels. Ajustez les filtres pour élargir la vue décisionnelle.
                        </div>
                    ) : null}
                </section>
            ) : null}
        </WorkspacePageShell>
    );
}
