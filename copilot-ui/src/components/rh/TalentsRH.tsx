/**
 * Page Talents RH — liste, modal CRUD base, drawer à onglets (skills hors modal).
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { AlertTriangle, Filter, RefreshCw, Search, UserPlus } from "lucide-react";
import { TalentListCard } from "@/components/rh/talent/TalentListCard";
import { CreateTalentModal } from "@/components/rh/CreateTalentModal";
import { DeleteTalentModal } from "@/components/rh/DeleteTalentModal";
import { TalentDrawer, type RhTalentDrawerTab } from "@/components/rh/talent/TalentDrawer";
import { useRhAvailabilityOverview } from "@/hooks/useRhAvailabilityOverview";
import { indexAvailabilityOverview } from "@/services/rh-availability.api";
import { useToast } from "@/providers/toast-provider";
import {
    fetchRhTalentsList,
    mergeRhTalentListItem,
    RH_TALENTS_WEBHOOK_BASE,
} from "@/api/rh-talents.api";
import { resolveRhWebhookBase } from "@/api/rh-dashboard.api";
import type { RhTalentListItem, RhTalentsListResponse } from "@/types/rh-talents.types";
import {
    RH_ALERT_ERROR,
    RH_BTN_PRIMARY,
    RH_BTN_SECONDARY,
    RH_FILTER_ACTIVE,
    RH_FILTER_BAR,
    RH_INPUT,
    RH_SELECT,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type TalentsRHProps = {
    enterpriseId: string;
    apiBase?: string;
    token?: string;
    onOpenProject?: (projectId: string) => void;
};

export function TalentsRH({
    enterpriseId,
    apiBase = RH_TALENTS_WEBHOOK_BASE,
    token,
    onOpenProject,
}: TalentsRHProps) {
    const resolvedBase = useMemo(() => resolveRhWebhookBase(apiBase), [apiBase]);
    const { push: pushToast } = useToast();

    const [data, setData] = useState<RhTalentsListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const availabilityOverviewQuery = useRhAvailabilityOverview(
        { token, apiBase: resolvedBase },
        Boolean(token) && Boolean(enterpriseId.trim()),
    );
    const availabilityById = useMemo(
        () => indexAvailabilityOverview(availabilityOverviewQuery.data),
        [availabilityOverviewQuery.data],
    );
    const availabilityLoading = availabilityOverviewQuery.isLoading;

    const [selectedTalent, setSelectedTalent] = useState<RhTalentListItem | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeDrawerTab, setActiveDrawerTab] = useState<RhTalentDrawerTab>("overview");
    const [skillsPostCreateCta, setSkillsPostCreateCta] = useState(false);

    const [createOpen, setCreateOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [drawerInitialEditMode, setDrawerInitialEditMode] = useState(false);

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [department, setDepartment] = useState("");
    const [availableOnly, setAvailableOnly] = useState(false);

    const openDrawer = (
        talent: RhTalentListItem,
        tab: RhTalentDrawerTab = "overview",
        postCreateSkills = false,
        editMode = false,
    ) => {
        setSelectedTalent(talent);
        setActiveDrawerTab(tab);
        setSkillsPostCreateCta(postCreateSkills);
        setDrawerInitialEditMode(editMode);
        setIsDrawerOpen(true);
    };

    const closeDrawer = () => {
        setIsDrawerOpen(false);
        setSkillsPostCreateCta(false);
        setDrawerInitialEditMode(false);
    };

    const handleTalentUpdated = (updated: RhTalentListItem) => {
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                talents: prev.talents.map((t) => (t.id === updated.id ? mergeRhTalentListItem(t, updated) : t)),
            };
        });
        if (selectedTalent?.id === updated.id) {
            setSelectedTalent((prev) => (prev ? mergeRhTalentListItem(prev, updated) : prev));
        }
        pushToast("Talent modifié avec succès", "success");
        void fetchList();
    };

    const fetchList = async () => {
        const eid = enterpriseId.trim();
        if (!eid) {
            setError("Identifiant entreprise manquant");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetchRhTalentsList(
                {
                    enterprise_id: eid,
                    status,
                    limit: 100,
                    search: search.trim() || undefined,
                    department: department || undefined,
                    available_only: availableOnly,
                },
                { apiBase: resolvedBase, token },
            );
            setData(res);
            void availabilityOverviewQuery.refetch();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Erreur API");
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = window.setTimeout(() => {
            void fetchList();
        }, 300);
        return () => window.clearTimeout(t);
    }, [enterpriseId, status, department, availableOnly, search, resolvedBase, token]);

    const departments = useMemo(
        () => Object.keys(data?.distribution?.by_department || {}).sort(),
        [data],
    );

    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const tid = searchParams.get("talentId")?.trim();
        if (!tid || !data?.talents?.length) return;
        const talent = data.talents.find((t) => t.id === tid);
        if (talent) {
            openDrawer(talent);
            setSearchParams({}, { replace: true });
        }
    }, [data?.talents, searchParams, setSearchParams]);

    return (
        <div className="min-h-full space-y-3 pb-4">
            <div className={cx("flex flex-wrap items-center justify-between gap-2", RH_FILTER_BAR)}>
                <p className={cx("shrink-0 text-xs tabular-nums", RH_TEXT_MUTED)}>
                    {data ? (
                        <>
                            <span className={cx("font-semibold", RH_TEXT_PRIMARY)}>{data.count}</span> talents ·{" "}
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {data.distribution.available}
                            </span>{" "}
                            dispo.
                        </>
                    ) : (
                        "Chargement…"
                    )}
                </p>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className={cx("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold", RH_BTN_PRIMARY)}
                    >
                        <UserPlus size={14} aria-hidden />
                        Ajouter un talent
                    </button>
                    <button
                        type="button"
                        onClick={() => void fetchList()}
                        disabled={loading}
                        className={cx("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs disabled:opacity-60", RH_BTN_SECONDARY)}
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden />
                        Actualiser
                    </button>
                </div>
            </div>

            <div className={cx("flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/90 bg-white p-2 shadow-sm dark:border-slate-700/90 dark:bg-slate-900")}>
                <div className="relative min-w-[160px] flex-1">
                    <Search size={14} className={cx("absolute left-2.5 top-2", RH_TEXT_MUTED)} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher nom, email, poste…"
                        className={cx("w-full border-0 bg-transparent py-1.5 pl-8 pr-2 text-sm shadow-none", RH_INPUT)}
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={RH_SELECT}
                >
                    <option value="all">Tous statuts</option>
                    <option value="active">Actifs</option>
                    <option value="inactive">Inactifs</option>
                    <option value="onleave">En congé</option>
                </select>
                {departments.length > 0 ? (
                    <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className={RH_SELECT}
                    >
                        <option value="">Tous départements</option>
                        {departments.map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>
                ) : null}
                <button
                    type="button"
                    onClick={() => setAvailableOnly((v) => !v)}
                    className={cx(
                        "flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium",
                        availableOnly ? RH_FILTER_ACTIVE : RH_BTN_SECONDARY,
                    )}
                >
                    <Filter size={13} aria-hidden /> Disponibles
                </button>
            </div>

            {loading ? (
                <div className={cx("flex h-48 items-center justify-center", RH_TEXT_MUTED)}>
                    <RefreshCw className="mr-2 animate-spin" size={16} /> Chargement…
                </div>
            ) : error ? (
                <div className={cx("flex items-center gap-2 p-4", RH_ALERT_ERROR)}>
                    <AlertTriangle size={16} /> {error}
                    <button
                        type="button"
                        onClick={() => void fetchList()}
                        className={cx("ml-auto rounded border border-rose-200 px-2.5 py-1 text-xs dark:border-rose-800", RH_BTN_SECONDARY)}
                    >
                        Réessayer
                    </button>
                </div>
            ) : !data?.talents.length ? (
                <div className={cx("py-16 text-center text-sm", RH_TEXT_MUTED)}>Aucun talent ne correspond aux filtres.</div>
            ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {data.talents.map((t) => (
                        <TalentListCard
                            key={t.id}
                            talent={t}
                            availability={availabilityById[t.id]}
                            availabilityLoading={availabilityLoading}
                            onOpen={() => openDrawer(t, "overview")}
                            onEdit={() => openDrawer(t, "overview", false, true)}
                            onDelete={() => setDeleteTarget({ id: t.id, name: t.name })}
                        />
                    ))}
                </div>
            )}

            <TalentDrawer
                open={isDrawerOpen}
                talentId={selectedTalent?.id ?? null}
                listPreview={selectedTalent}
                availabilityPreview={
                    selectedTalent?.id ? availabilityById[selectedTalent.id] ?? null : null
                }
                activeTab={activeDrawerTab}
                onTabChange={setActiveDrawerTab}
                enterpriseId={enterpriseId.trim()}
                apiBase={resolvedBase}
                token={token}
                onClose={closeDrawer}
                onOpenProject={onOpenProject}
                onTalentUpdated={handleTalentUpdated}
                skillsPostCreateCta={skillsPostCreateCta}
                initialEditMode={drawerInitialEditMode}
                onInitialEditModeConsumed={() => setDrawerInitialEditMode(false)}
            />

            <DeleteTalentModal
                open={deleteTarget != null}
                talentId={deleteTarget?.id ?? null}
                talentName={deleteTarget?.name ?? ""}
                onClose={() => setDeleteTarget(null)}
                apiBase={resolvedBase}
                token={token}
                onDeleted={() => {
                    if (deleteTarget && selectedTalent?.id === deleteTarget.id) {
                        closeDrawer();
                        setSelectedTalent(null);
                    }
                    pushToast("Talent désactivé avec succès", "success");
                    void fetchList();
                }}
            />

            <CreateTalentModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                apiBase={resolvedBase}
                token={token}
                onCreated={(talent) => {
                    pushToast("Talent créé avec succès", "success");
                    setData((prev) => {
                        if (!prev) {
                            return {
                                status: "success",
                                count: 1,
                                talents: [talent],
                                distribution: {
                                    available: 0,
                                    fully_loaded: 0,
                                    by_department: talent.department
                                        ? { [talent.department]: 1 }
                                        : {},
                                },
                            };
                        }
                        const exists = prev.talents.some((t) => t.id === talent.id);
                        const talents = exists ? prev.talents : [talent, ...prev.talents];
                        const by_department = { ...prev.distribution.by_department };
                        if (talent.department) {
                            by_department[talent.department] = (by_department[talent.department] ?? 0) + 1;
                        }
                        return {
                            ...prev,
                            count: exists ? prev.count : prev.count + 1,
                            talents,
                            distribution: { ...prev.distribution, by_department },
                        };
                    });
                    openDrawer(talent, "skills", true);
                    void fetchList();
                }}
            />
        </div>
    );
}
