import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { ProjectsEmptyState } from "@/components/manager/projects/ProjectsEmptyState";
import { TeamInsightBar } from "@/components/team/TeamInsightBar";
import { TeamSegmentsBar } from "@/components/team/TeamSegmentsBar";
import { TalentDrawer } from "@/components/team/TalentDrawer";
import { TalentIntelligenceTable } from "@/components/team/TalentIntelligenceTable";
import { TalentMobileCards } from "@/components/team/TalentMobileCards";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useTeam, useWatchdogScan } from "@/hooks/useTeam";
import { authStorage } from "@/lib/auth-storage";
import {
    matchesTeamSearch,
    matchesTeamSegmentFilter,
    sortTeamTalents,
    type TeamSegmentFilter,
    type TeamTableDensity,
    type TeamTableSortKey,
} from "@/lib/manager-team-list-utils";
import type { TalentListItem } from "@/types/api.types";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";

const DENSITY_STORAGE_KEY = "team.density";
const FILTER_STORAGE_KEY = "team.segmentFilter";

function readInitialDensity(): TeamTableDensity {
    if (typeof window === "undefined") return "comfortable";
    return window.localStorage.getItem(DENSITY_STORAGE_KEY) === "compact" ? "compact" : "comfortable";
}

function readInitialSegmentFilter(): TeamSegmentFilter {
    if (typeof window === "undefined") return "all";
    const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (stored === "all" || stored === "overloaded" || stored === "contract_ending" || stored === "healthy") return stored;
    return "all";
}

function segmentFromSearchParams(searchParams: URLSearchParams): TeamSegmentFilter | null {
    const filter = searchParams.get("filter");
    if (filter === "overloaded") return "overloaded";
    if (searchParams.get("contract_ending") === "1") return "contract_ending";
    return null;
}

export default function TeamPage() {
    const { t } = useTranslation("common");
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [segmentFilter, setSegmentFilter] = useState<TeamSegmentFilter>(() => {
        const fromUrl = segmentFromSearchParams(searchParams);
        return fromUrl ?? readInitialSegmentFilter();
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [density, setDensity] = useState<TeamTableDensity>(() => readInitialDensity());
    const [sortKey, setSortKey] = useState<TeamTableSortKey>("charge_pct");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [selectedTalentId, setSelectedTalentId] = useState<string | null>(null);
    const [isTalentDrawerOpen, setIsTalentDrawerOpen] = useState(false);

    const accessToken = authStorage.getAccessToken() ?? undefined;
    const team = useTeam({ scope: "mine", limit: 200 });
    const watchdogScan = useWatchdogScan();

    const talents = team.data?.talents ?? [];
    const counts = team.data?.counts;

    useEffect(() => {
        window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
    }, [density]);

    useEffect(() => {
        window.localStorage.setItem(FILTER_STORAGE_KEY, segmentFilter);
    }, [segmentFilter]);

    useEffect(() => {
        const fromUrl = segmentFromSearchParams(searchParams);
        if (fromUrl) setSegmentFilter(fromUrl);
    }, [searchParams]);

    useEffect(() => {
        const talentId = searchParams.get("talent_id")?.trim();
        if (!talentId) return;
        const next = new URLSearchParams(searchParams);
        next.delete("talent_id");
        setSearchParams(next, { replace: true });
        setSelectedTalentId(talentId);
        setIsTalentDrawerOpen(true);
    }, [searchParams, setSearchParams]);

    useCopilotPage();
    useWorkspaceTopbarMeta(t("managerWorkspace.teamPageHero.title"), undefined, null);

    const openTalentDrawer = useCallback((talentId: string) => {
        setSelectedTalentId(talentId);
        setIsTalentDrawerOpen(true);
    }, []);

    const closeTalentDrawer = useCallback(() => {
        setIsTalentDrawerOpen(false);
        setSelectedTalentId(null);
    }, []);

    const goToTalentDetail = useCallback(
        (talentId: string) => {
            navigate(`/workspace/manager/team/${encodeURIComponent(talentId)}`);
        },
        [navigate],
    );

    const sendTalentMessage = useCallback((talent: TalentListItem) => {
        const email = talent.email?.trim();
        if (!email) return;
        window.location.href = `mailto:${encodeURIComponent(email)}`;
    }, []);

    const handleSegmentChange = useCallback(
        (next: TeamSegmentFilter) => {
            setSegmentFilter(next);
            const params = new URLSearchParams(searchParams);
            if (next === "overloaded") {
                params.set("filter", "overloaded");
                params.delete("contract_ending");
            } else if (next === "contract_ending") {
                params.delete("filter");
                params.set("contract_ending", "1");
            } else {
                params.delete("filter");
                params.delete("contract_ending");
            }
            setSearchParams(params, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    const filteredTalents = useMemo(
        () =>
            talents.filter(
                (talent) => matchesTeamSegmentFilter(talent, segmentFilter) && matchesTeamSearch(talent, searchQuery),
            ),
        [talents, segmentFilter, searchQuery],
    );

    const sortedTalents = useMemo(
        () => sortTeamTalents(filteredTalents, sortKey, sortDir),
        [filteredTalents, sortKey, sortDir],
    );

    const onHeaderSort = useCallback((key: TeamTableSortKey) => {
        setSortKey((prevKey) => {
            if (prevKey === key) {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                return prevKey;
            }
            setSortDir(key === "name" || key === "contract_end_date" ? "asc" : "desc");
            return key;
        });
    }, []);

    const toggleDensity = () => setDensity((d) => (d === "comfortable" ? "compact" : "comfortable"));

    const showEmptyOverloaded = !team.isLoading && sortedTalents.length === 0 && segmentFilter === "overloaded";
    const showEmptySearch = !team.isLoading && sortedTalents.length === 0 && Boolean(searchQuery.trim());

    return (
        <WorkspacePageShell role="manager" eyebrow="" title="" omitHeader>
            <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6 lg:px-8">
                <header className="space-y-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                            Mon équipe
                            {typeof counts?.total === "number" ? (
                                <span className="ml-2 text-base font-normal text-slate-400 tabular-nums">{counts.total}</span>
                            ) : null}
                        </h1>
                        <Button type="button" color="tertiary" size="sm" onClick={toggleDensity}>
                            {density === "comfortable" ? "Dense" : "Confort"}
                        </Button>
                    </div>

                    <TeamInsightBar counts={counts} onFilterClick={handleSegmentChange} />

                    <TeamSegmentsBar
                        filter={segmentFilter}
                        onFilterChange={handleSegmentChange}
                        counts={counts}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                    />
                </header>

                {team.isLoading && !team.data ? (
                    <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Chargement de l&apos;équipe…</p>
                ) : null}

                {team.isError ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
                        Impossible de charger l&apos;équipe.{" "}
                        <button type="button" onClick={() => void team.refetch()} className="underline">
                            Réessayer
                        </button>
                    </p>
                ) : null}

                {showEmptyOverloaded ? (
                    <ProjectsEmptyState
                        icon={CheckCircle}
                        title="Aucun talent en surcharge"
                        description="L'équipe est sous contrôle. Tu seras notifié si une situation évolue."
                    />
                ) : null}

                {showEmptySearch ? (
                    <ProjectsEmptyState
                        title={`Aucun talent ne correspond à « ${searchQuery.trim()} »`}
                        actionLabel="Réinitialiser"
                        onAction={() => setSearchQuery("")}
                    />
                ) : null}

                {!showEmptyOverloaded && !showEmptySearch ? (
                    <>
                        <TalentIntelligenceTable
                            rows={sortedTalents}
                            sort={{ key: sortKey, dir: sortDir }}
                            onSort={onHeaderSort}
                            density={density}
                            isLoading={team.isLoading}
                            onOpenDrawer={openTalentDrawer}
                            onGoDetail={goToTalentDetail}
                            onSendMessage={sendTalentMessage}
                        />

                        <TalentMobileCards
                            rows={sortedTalents}
                            density={density}
                            isLoading={team.isLoading}
                            onOpenDrawer={openTalentDrawer}
                            onGoDetail={goToTalentDetail}
                            onSendMessage={sendTalentMessage}
                        />
                    </>
                ) : null}
            </div>

            <TalentDrawer
                talentId={selectedTalentId}
                open={isTalentDrawerOpen}
                onClose={closeTalentDrawer}
                accessToken={accessToken}
                onProjectClick={(projectId) => navigate(managerProjectsOpenModalPath(projectId))}
                onWatchdog={async (id) => {
                    await watchdogScan.mutateAsync({ talent_id: id, use_ai: true });
                }}
            />
        </WorkspacePageShell>
    );
}
