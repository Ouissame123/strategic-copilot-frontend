import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    Brain,
    Check,
    Pencil,
    Plus,
    Trash2,
    X,
} from "lucide-react";
import {
    deleteRequirement,
    fetchRequirements,
    type Requirement,
    type RequirementsStats,
} from "@/api/requirements";
import { AddRequirementModal } from "@/components/AddRequirementModal";
import { EditRequirementModal } from "@/components/EditRequirementModal";
import { useToast } from "@/providers/toast-provider";
import { cx } from "@/utils/cx";

export type CompetencesTabProps = {
    projectId: string;
    enterpriseId: string;
    token: string;
    onNavigateToTeam?: () => void;
};

type SortKey =
    | "skill_name"
    | "level_required"
    | "criticality"
    | "best_pool_level"
    | "requirement_type"
    | "is_mandatory"
    | "priority"
    | "weight";

const LEVEL_LABELS: Record<number, string> = {
    1: "Niv. 1 — Débutant",
    2: "Niv. 2 — Junior",
    3: "Niv. 3 — Intermédiaire",
    4: "Niv. 4 — Senior",
    5: "Niv. 5 — Expert",
};

function levelLabel(n: number): string {
    return LEVEL_LABELS[n] ?? `Niv. ${n}`;
}

function criticalityBadge(c: number): { label: string; className: string } {
    if (c >= 3) return { label: "Critique", className: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200" };
    if (c === 2) return { label: "Moyenne", className: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200" };
    return { label: "Faible", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
}

function skillTypeBadge(type: string): { label: string; className: string } {
    const t = type.toLowerCase();
    if (t === "soft") return { label: "Soft skill", className: "bg-violet-100 text-violet-800 dark:bg-violet-950/50" };
    if (t === "management") return { label: "Management", className: "bg-orange-100 text-orange-800 dark:bg-orange-950/50" };
    return { label: "Technique", className: "bg-blue-100 text-blue-800 dark:bg-blue-950/50" };
}

function requirementTypeLabel(t: string): string {
    const map: Record<string, string> = {
        core: "Essentielle",
        mandatory: "Obligatoire",
        nice_to_have: "Optionnelle",
        optional: "Optionnelle",
    };
    return map[t] ?? t;
}

function coverageBadge(req: Requirement): { label: string; className: string } {
    const pool = req.best_pool_level;
    const required = req.level_required;
    if (pool == null || pool <= 0) {
        return { label: "Non couverte", className: "bg-rose-100 text-rose-800 dark:bg-rose-950/50" };
    }
    if (pool >= required) {
        return { label: `Couverte (niv. ${pool})`, className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50" };
    }
    return {
        label: `Partielle (niv. ${pool}/${required})`,
        className: "bg-orange-100 text-orange-800 dark:bg-orange-950/50",
    };
}

function coverageBarColor(covered: number, total: number): string {
    if (total <= 0) return "bg-slate-300";
    const pct = (covered / total) * 100;
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 50) return "bg-orange-500";
    return "bg-rose-500";
}

function compareRequirements(a: Requirement, b: Requirement, key: SortKey, dir: "asc" | "desc"): number {
    let cmp = 0;
    switch (key) {
        case "skill_name":
            cmp = (a.skill_name ?? "").localeCompare(b.skill_name ?? "", "fr");
            break;
        case "level_required":
            cmp = a.level_required - b.level_required;
            break;
        case "criticality":
            cmp = a.criticality - b.criticality;
            break;
        case "best_pool_level":
            cmp = (a.best_pool_level ?? -1) - (b.best_pool_level ?? -1);
            break;
        case "requirement_type":
            cmp = a.requirement_type.localeCompare(b.requirement_type, "fr");
            break;
        case "is_mandatory":
            cmp = Number(a.is_mandatory) - Number(b.is_mandatory);
            break;
        case "priority":
            cmp = a.priority - b.priority;
            break;
        case "weight":
            cmp = a.weight - b.weight;
            break;
        default:
            cmp = 0;
    }
    if (cmp === 0) {
        if (b.criticality !== a.criticality) return b.criticality - a.criticality;
        return a.priority - b.priority;
    }
    return dir === "asc" ? cmp : -cmp;
}

type ColumnDef = { key: SortKey; label: string; hideTablet?: boolean };

const COLUMNS: ColumnDef[] = [
    { key: "skill_name", label: "Compétence" },
    { key: "level_required", label: "Niveau requis" },
    { key: "criticality", label: "Criticité" },
    { key: "best_pool_level", label: "Couverture pool" },
    { key: "requirement_type", label: "Type" },
    { key: "is_mandatory", label: "Obligatoire" },
    { key: "weight", label: "Poids", hideTablet: true },
    { key: "priority", label: "Priorité", hideTablet: true },
];

function RequirementRowActions({
    req,
    confirmDeleteId,
    deletingId,
    onEdit,
    onDeleteRequest,
    onDeleteConfirm,
    onDeleteCancel,
}: {
    req: Requirement;
    confirmDeleteId: string | null;
    deletingId: string | null;
    onEdit: (req: Requirement) => void;
    onDeleteRequest: (id: string) => void;
    onDeleteConfirm: (req: Requirement) => void;
    onDeleteCancel: () => void;
}) {
    const isConfirm = confirmDeleteId === req.requirement_id;
    const isDeleting = deletingId === req.requirement_id;

    return (
        <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={() => onEdit(req)}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={`Modifier ${req.skill_name}`}
            >
                <Pencil size={15} />
            </button>
            <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                    if (isConfirm) onDeleteConfirm(req);
                    else onDeleteRequest(req.requirement_id);
                }}
                onBlur={() => {
                    if (isConfirm) window.setTimeout(onDeleteCancel, 150);
                }}
                className={cx(
                    "rounded px-2 py-1 text-xs font-medium",
                    isConfirm
                        ? "bg-rose-600 text-white hover:bg-rose-700"
                        : "p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30",
                )}
                aria-label={isConfirm ? "Confirmer la suppression" : `Supprimer ${req.skill_name}`}
            >
                {isConfirm ? (isDeleting ? "…" : "Confirmer ?") : <Trash2 size={15} />}
            </button>
        </div>
    );
}

function RequirementMobileCard({
    req,
    confirmDeleteId,
    deletingId,
    onEdit,
    onDeleteRequest,
    onDeleteConfirm,
    onDeleteCancel,
}: {
    req: Requirement;
    confirmDeleteId: string | null;
    deletingId: string | null;
    onEdit: (req: Requirement) => void;
    onDeleteRequest: (id: string) => void;
    onDeleteConfirm: (req: Requirement) => void;
    onDeleteCancel: () => void;
}) {
    const typeBadge = skillTypeBadge(req.skill_type);
    const crit = criticalityBadge(req.criticality ?? 2);
    const cov = coverageBadge(req);

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{req.skill_name ?? "Compétence inconnue"}</p>
                    {req.skill_category ? (
                        <p className="text-xs text-slate-500">{req.skill_category}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-medium", typeBadge.className)}>
                            {typeBadge.label}
                        </span>
                        <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-medium", crit.className)}>
                            {crit.label}
                        </span>
                        <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-medium", cov.className)}>
                            {cov.label}
                        </span>
                    </div>
                </div>
                <RequirementRowActions
                    req={req}
                    confirmDeleteId={confirmDeleteId}
                    deletingId={deletingId}
                    onEdit={onEdit}
                    onDeleteRequest={onDeleteRequest}
                    onDeleteConfirm={onDeleteConfirm}
                    onDeleteCancel={onDeleteCancel}
                />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div>
                    <dt className="text-slate-400">Niveau</dt>
                    <dd className="font-medium text-slate-800 dark:text-slate-200">{levelLabel(req.level_required)}</dd>
                </div>
                <div>
                    <dt className="text-slate-400">Type besoin</dt>
                    <dd className="font-medium">{requirementTypeLabel(req.requirement_type)}</dd>
                </div>
                <div>
                    <dt className="text-slate-400">Obligatoire</dt>
                    <dd>{req.is_mandatory ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-slate-400" />}</dd>
                </div>
                <div>
                    <dt className="text-slate-400">Priorité</dt>
                    <dd className="font-medium">{req.priority}</dd>
                </div>
            </dl>
        </article>
    );
}

export function CompetencesTab({ projectId, token, onNavigateToTeam }: CompetencesTabProps) {
    const { push: toast } = useToast();
    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [stats, setStats] = useState<RequirementsStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingReq, setEditingReq] = useState<Requirement | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>("criticality");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const loadRequirements = useCallback(async () => {
        if (!projectId || !token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetchRequirements(projectId, token);
            setRequirements(res.requirements);
            setStats(res.stats);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    }, [projectId, token]);

    useEffect(() => {
        void loadRequirements();
    }, [loadRequirements]);

    useEffect(() => {
        if (!confirmDeleteId) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setConfirmDeleteId(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [confirmDeleteId]);

    const sortedRequirements = useMemo(() => {
        return [...requirements].sort((a, b) => compareRequirements(a, b, sortKey, sortDir));
    }, [requirements, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
            setSortKey(key);
            setSortDir(key === "skill_name" || key === "priority" ? "asc" : "desc");
        }
    };

    const handleDelete = async (req: Requirement) => {
        setDeletingId(req.requirement_id);
        try {
            await deleteRequirement(projectId, req.requirement_id, token);
            setRequirements((prev) => prev.filter((r) => r.requirement_id !== req.requirement_id));
            toast(`"${req.skill_name}" supprimée`, "success");
            setConfirmDeleteId(null);
            await loadRequirements();
        } catch (e: unknown) {
            toast(e instanceof Error ? e.message : "Erreur suppression", "error");
        } finally {
            setDeletingId(null);
        }
    };

    const coveragePct =
        stats && stats.total > 0 ? Math.round((stats.covered / stats.total) * 100) : 0;
    const barWidth = stats && stats.total > 0 ? `${(stats.covered / stats.total) * 100}%` : "0%";

    if (loading && requirements.length === 0 && !error) {
        return (
            <div className="space-y-4 p-5 animate-pulse">
                <div className="h-10 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-lg bg-slate-200 dark:bg-slate-800" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Compétences requises</h2>
                <button
                    type="button"
                    onClick={() => setIsAddOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                    <Plus size={16} />
                    Ajouter une compétence
                </button>
            </div>

            {stats ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="min-w-[200px] flex-1">
                            <p className="mb-1 text-xs text-slate-500">
                                Couverture : {stats.covered}/{stats.total} compétences couvertes ({coveragePct}%)
                            </p>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div
                                    className={cx("h-full transition-all", coverageBarColor(stats.covered, stats.total))}
                                    style={{ width: barWidth }}
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span
                                className={cx(
                                    "rounded-full px-2.5 py-1 font-medium",
                                    stats.critical > 0
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-slate-100 text-slate-600",
                                )}
                            >
                                Critiques : {stats.critical}
                            </span>
                            <span
                                className={cx(
                                    "rounded-full px-2.5 py-1 font-medium",
                                    stats.partial > 0
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-slate-100 text-slate-600",
                                )}
                            >
                                Partielles : {stats.partial}
                            </span>
                            <span
                                className={cx(
                                    "rounded-full px-2.5 py-1 font-medium",
                                    stats.uncovered > 0
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-slate-100 text-slate-600",
                                )}
                            >
                                Non couvertes : {stats.uncovered}
                            </span>
                        </div>
                    </div>
                </div>
            ) : null}

            {error ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30">
                    <span>Erreur : {error}</span>
                    <button
                        type="button"
                        onClick={() => void loadRequirements()}
                        className="rounded border border-rose-300 px-2 py-1 text-xs font-semibold hover:bg-rose-100"
                    >
                        Réessayer
                    </button>
                </div>
            ) : null}

            {stats && stats.uncovered > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30">
                    <p className="flex items-start gap-2">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                        <span>
                            {stats.uncovered} compétence(s) non couverte(s) dans votre organisation. Le Matchmaker peut
                            suggérer des formations ou recrutements.
                        </span>
                    </p>
                    {onNavigateToTeam ? (
                        <button
                            type="button"
                            onClick={onNavigateToTeam}
                            className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50"
                        >
                            Lancer l&apos;analyse Matchmaker
                        </button>
                    ) : null}
                </div>
            ) : null}

            {!loading && !error && requirements.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
                    <Brain size={48} className="text-primary-300" strokeWidth={1.25} />
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        Aucune compétence requise définie
                    </p>
                    <p className="max-w-md text-sm text-slate-500">
                        Ajoutez les compétences nécessaires pour ce projet. Cela permettra au Matchmaker
                        d&apos;identifier les talents disponibles.
                    </p>
                    <button
                        type="button"
                        onClick={() => setIsAddOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                    >
                        <Plus size={16} />
                        Ajouter une compétence
                    </button>
                </div>
            ) : null}

            {requirements.length > 0 ? (
                <>
                    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block dark:border-slate-700 dark:bg-slate-900">
                        <table className="w-full min-w-[880px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
                                    {COLUMNS.map((col) => (
                                        <th
                                            key={col.key}
                                            className={cx(
                                                "px-3 py-2.5 font-semibold",
                                                col.hideTablet && "hidden lg:table-cell",
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleSort(col.key)}
                                                className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200"
                                            >
                                                {col.label}
                                                {sortKey === col.key ? (
                                                    sortDir === "asc" ? (
                                                        <ArrowUp size={12} />
                                                    ) : (
                                                        <ArrowDown size={12} />
                                                    )
                                                ) : null}
                                            </button>
                                        </th>
                                    ))}
                                    <th className="px-3 py-2.5 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRequirements.map((req) => {
                                    const typeBadge = skillTypeBadge(req.skill_type);
                                    const crit = criticalityBadge(req.criticality ?? 2);
                                    const cov = coverageBadge(req);
                                    return (
                                        <tr
                                            key={req.requirement_id}
                                            className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                                        >
                                            <td className="px-3 py-3">
                                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                                    {req.skill_name ?? "Compétence inconnue"}
                                                </p>
                                                {req.skill_category ? (
                                                    <p className="text-xs text-slate-500">{req.skill_category}</p>
                                                ) : null}
                                                <span
                                                    className={cx(
                                                        "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                                                        typeBadge.className,
                                                    )}
                                                >
                                                    {typeBadge.label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                                                {levelLabel(req.level_required)}
                                            </td>
                                            <td className="px-3 py-3">
                                                <span
                                                    className={cx(
                                                        "rounded-full px-2 py-0.5 text-xs font-medium",
                                                        crit.className,
                                                    )}
                                                >
                                                    {crit.label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span
                                                    className={cx(
                                                        "rounded-full px-2 py-0.5 text-xs font-medium",
                                                        cov.className,
                                                    )}
                                                >
                                                    {cov.label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                                                {requirementTypeLabel(req.requirement_type)}
                                            </td>
                                            <td className="px-3 py-3">
                                                {req.is_mandatory ? (
                                                    <Check size={16} className="text-emerald-600" aria-label="Oui" />
                                                ) : (
                                                    <X size={16} className="text-slate-400" aria-label="Non" />
                                                )}
                                            </td>
                                            <td className="hidden px-3 py-3 text-slate-600 lg:table-cell">{req.weight}</td>
                                            <td className="hidden px-3 py-3 text-slate-600 lg:table-cell">{req.priority}</td>
                                            <td className="px-3 py-3">
                                                <RequirementRowActions
                                                    req={req}
                                                    confirmDeleteId={confirmDeleteId}
                                                    deletingId={deletingId}
                                                    onEdit={setEditingReq}
                                                    onDeleteRequest={setConfirmDeleteId}
                                                    onDeleteConfirm={(r) => void handleDelete(r)}
                                                    onDeleteCancel={() => setConfirmDeleteId(null)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-3 md:hidden">
                        {sortedRequirements.map((req) => (
                            <RequirementMobileCard
                                key={req.requirement_id}
                                req={req}
                                confirmDeleteId={confirmDeleteId}
                                deletingId={deletingId}
                                onEdit={setEditingReq}
                                onDeleteRequest={setConfirmDeleteId}
                                onDeleteConfirm={(r) => void handleDelete(r)}
                                onDeleteCancel={() => setConfirmDeleteId(null)}
                            />
                        ))}
                    </div>
                </>
            ) : null}

            <AddRequirementModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                projectId={projectId}
                token={token}
                onCreated={() => toast("Compétence ajoutée", "success")}
                onReload={loadRequirements}
                onError={(msg) => toast(msg, "error")}
            />

            <EditRequirementModal
                requirement={editingReq}
                onClose={() => setEditingReq(null)}
                projectId={projectId}
                token={token}
                onUpdated={(updated) => {
                    setRequirements((prev) =>
                        prev.map((r) => (r.requirement_id === updated.requirement_id ? { ...r, ...updated } : r)),
                    );
                    toast("Compétence mise à jour", "success");
                }}
                onError={(msg) => toast(msg, msg === "Aucune modification" ? "info" : "error")}
            />
        </div>
    );
}
