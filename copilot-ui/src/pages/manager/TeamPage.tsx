import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { TeamHero } from "@/components/team/TeamHero";
import { TeamFiltersBar } from "@/components/team/TeamFiltersBar";
import { TalentIntelligenceTable } from "@/components/team/TalentIntelligenceTable";
import { TalentMobileCards } from "@/components/team/TalentMobileCards";
import { TALENT_PAGE_BG } from "@/components/talent/talent-detail-shared";
import {
    compareNullableNum,
    matchesIpiFilter,
    matchesStatusFilter,
    resolveTalentRiskLevel,
    sortToggle,
    type TeamIpiFilter,
    type TeamSortKey,
    type TeamStatusFilter,
} from "@/components/team/team-list-utils";
import { managerTeamApi } from "@/api/manager-team.api";
import { TalentDrawer } from "@/components/team/TalentDrawer";
import { useTeam, useWatchdogScan } from "@/hooks/useTeam";
import { authStorage } from "@/lib/auth-storage";
import { useToast } from "@/providers/toast-provider";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";

const RISK_RANK = { low: 1, medium: 2, high: 3 } as const;

export default function TeamPage() {
    const { t } = useTranslation("common");
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<{ key: TeamSortKey; dir: "asc" | "desc" }>({ key: "allocation", dir: "desc" });
    const [contractEndingOnly, setContractEndingOnly] = useState(false);
    const [statusFilter, setStatusFilter] = useState<TeamStatusFilter>("all");
    const [ipiFilter, setIpiFilter] = useState<TeamIpiFilter>("all");
    const [selectedTalentId, setSelectedTalentId] = useState<string | null>(null);
    const [isTalentDrawerOpen, setIsTalentDrawerOpen] = useState(false);
    const accessToken = authStorage.getAccessToken() ?? undefined;
    const { push } = useToast();

    const openTalentDrawer = (talentId: string) => {
        setSelectedTalentId(talentId);
        setIsTalentDrawerOpen(true);
    };

    const closeTalentDrawer = () => {
        setIsTalentDrawerOpen(false);
        setSelectedTalentId(null);
    };

    const goToTalentDetail = (talentId: string) => {
        navigate(`/workspace/manager/team/${encodeURIComponent(talentId)}`);
    };

    const goToTalentWatchdog = (talentId: string) => {
        navigate(`/workspace/manager/team/${encodeURIComponent(talentId)}?tab=watchdog`);
    };

    const filterParam = searchParams.get("filter");
    const contractEndingParam = searchParams.get("contract_ending");
    const isOverloadedFilter = filterParam === "overloaded";
    const isContractEndingFilter = contractEndingParam === "1";

    useEffect(() => {
        const talentId = searchParams.get("talent_id")?.trim();
        if (!talentId) return;
        const next = new URLSearchParams(searchParams);
        next.delete("talent_id");
        setSearchParams(next, { replace: true });
        setSelectedTalentId(talentId);
        setIsTalentDrawerOpen(true);
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        if (isContractEndingFilter) setContractEndingOnly(true);
    }, [isContractEndingFilter]);

    const team = useTeam({
        scope: "mine",
        limit: 200,
        search: search.trim() || undefined,
        contract_ending: contractEndingOnly || isContractEndingFilter || undefined,
    });
    const watchdogScan = useWatchdogScan();

    const onHeaderSort = (key: TeamSortKey) => {
        setSort((prev) => sortToggle(prev.key, key, prev.dir));
    };

    const rows = useMemo(() => {
        let list = [...(team.data?.talents ?? [])];

        if (isOverloadedFilter) {
            list = list.filter((talent) => Number(talent.total_allocation_pct ?? 0) >= 100);
        }
        if (isContractEndingFilter || contractEndingOnly) {
            const horizon = new Date();
            horizon.setDate(horizon.getDate() + 90);
            list = list.filter((talent) => {
                if (!talent.contract_end_date) return false;
                const endDate = new Date(talent.contract_end_date);
                return !Number.isNaN(endDate.getTime()) && endDate <= horizon;
            });
        }

        list = list.filter((t) => matchesStatusFilter(t, statusFilter) && matchesIpiFilter(t, ipiFilter));

        const { key, dir } = sort;
        const mul = dir === "asc" ? 1 : -1;

        list.sort((a, b) => {
            if (key === "name") return mul * a.full_name.localeCompare(b.full_name, "fr");
            if (key === "allocation") return mul * ((a.total_allocation_pct ?? 0) - (b.total_allocation_pct ?? 0));
            if (key === "ipi") return mul * compareNullableNum(a.insights?.ipi_score ?? null, b.insights?.ipi_score ?? null, dir);
            if (key === "contract") {
                const da = a.contract_end_date ?? "9999-12-31";
                const db = b.contract_end_date ?? "9999-12-31";
                return mul * da.localeCompare(db);
            }
            if (key === "status") {
                return mul * (a.project_status ?? "").localeCompare(b.project_status ?? "", "fr");
            }
            if (key === "risk") {
                const ra = RISK_RANK[resolveTalentRiskLevel(a)];
                const rb = RISK_RANK[resolveTalentRiskLevel(b)];
                return mul * (ra - rb);
            }
            return 0;
        });

        return list;
    }, [
        team.data?.talents,
        sort,
        isOverloadedFilter,
        isContractEndingFilter,
        contractEndingOnly,
        statusFilter,
        ipiFilter,
    ]);

    const kpis = useMemo(() => {
        const list = team.data?.talents ?? [];
        return {
            total: list.length,
            overloaded: list.filter((t) => Number(t.total_allocation_pct ?? 0) > 100 || Number(t.remaining_capacity_pct ?? 0) < 0).length,
            healthy: list.filter((t) => t.status_color === "green").length,
            contractEndingSoon: list.filter((t) => Boolean(t.contract_ending_soon)).length,
        };
    }, [team.data?.talents]);

    const activeFiltersCount = useMemo(() => {
        let n = 0;
        if (search.trim()) n += 1;
        if (contractEndingOnly || isContractEndingFilter) n += 1;
        if (isOverloadedFilter) n += 1;
        if (statusFilter !== "all") n += 1;
        if (ipiFilter !== "all") n += 1;
        return n;
    }, [search, contractEndingOnly, isContractEndingFilter, isOverloadedFilter, statusFilter, ipiFilter]);

    const onResetFilters = () => {
        setSearch("");
        setContractEndingOnly(false);
        setStatusFilter("all");
        setIpiFilter("all");
        setSearchParams({});
    };

    const onOverloadedToggle = () => {
        const next = new URLSearchParams(searchParams);
        if (isOverloadedFilter) next.delete("filter");
        else next.set("filter", "overloaded");
        setSearchParams(next);
    };

    const onContractEndingChange = (checked: boolean) => {
        setContractEndingOnly(checked);
        const next = new URLSearchParams(searchParams);
        if (checked) next.set("contract_ending", "1");
        else next.delete("contract_ending");
        setSearchParams(next);
    };

    useWorkspaceTopbarMeta(t("managerWorkspace.teamPageHero.title"), t("managerWorkspace.teamPageHero.subtitle"));

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.teamPageHero.title")}
            description={false}
            omitHeader
        >
            <section className={TALENT_PAGE_BG}>
                <TeamHero
                    title={t("managerWorkspace.teamPageHero.title")}
                    subtitle={t("managerWorkspace.teamPageHero.subtitle")}
                    kpis={kpis}
                    watchdogPending={watchdogScan.isPending}
                    onGlobalWatchdog={() =>
                        watchdogScan.mutate(
                            { use_ai: true },
                            {
                                onSuccess: () => push("Scan Watchdog global lancé.", "success"),
                                onError: () => push("Échec du scan Watchdog global.", "error"),
                            },
                        )
                    }
                />

                <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
                    <TeamFiltersBar
                        search={search}
                        onSearchChange={setSearch}
                        contractEndingOnly={contractEndingOnly || isContractEndingFilter}
                        onContractEndingChange={onContractEndingChange}
                        overloadedOnly={isOverloadedFilter}
                        onOverloadedToggle={onOverloadedToggle}
                        statusFilter={statusFilter}
                        onStatusFilterChange={setStatusFilter}
                        ipiFilter={ipiFilter}
                        onIpiFilterChange={setIpiFilter}
                        onReset={onResetFilters}
                        activeFiltersCount={activeFiltersCount}
                    />

                    {(isOverloadedFilter || isContractEndingFilter || activeFiltersCount > 0) &&
                    rows.length !== (team.data?.talents?.length ?? 0) ? (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                            {rows.length} talent{rows.length > 1 ? "s" : ""} affiché{rows.length > 1 ? "s" : ""} sur{" "}
                            {team.data?.talents?.length ?? 0}
                        </p>
                    ) : null}

                    {team.isLoading ? (
                        <p className="text-center text-sm text-slate-500 dark:text-slate-400">Chargement de l&apos;équipe…</p>
                    ) : null}

                    {team.isError ? (
                        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
                            Impossible de charger l&apos;équipe.
                        </p>
                    ) : null}

                    <TalentIntelligenceTable
                        rows={rows}
                        sort={sort}
                        onSort={onHeaderSort}
                        isLoading={team.isLoading}
                        onOpenDrawer={openTalentDrawer}
                        onGoDetail={goToTalentDetail}
                        onGoWatchdog={goToTalentWatchdog}
                    />

                    <TalentMobileCards
                        rows={rows}
                        isLoading={team.isLoading}
                        onOpenDrawer={openTalentDrawer}
                        onGoDetail={goToTalentDetail}
                        onGoWatchdog={goToTalentWatchdog}
                    />
                </main>
            </section>

            <TalentDrawer
                talentId={selectedTalentId}
                open={isTalentDrawerOpen}
                onClose={closeTalentDrawer}
                accessToken={accessToken}
                onProjectClick={(projectId) => navigate(managerProjectsOpenModalPath(projectId))}
                onWatchdog={async (id) => {
                    await managerTeamApi.watchdogScan({ talent_id: id, use_ai: true });
                    push("Scan Watchdog lancé.", "success");
                }}
            />
        </WorkspacePageShell>
    );
}
