import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Button } from "@/components/base/buttons/button";
import { AddSkillModal } from "@/components/talent/skills/AddSkillModal";
import { SkillEditDrawer } from "@/components/talent/skills/SkillEditDrawer";
import { SkillGapCard } from "@/components/talent/skills/SkillGapCard";
import {
    CatalogList,
    SKILLS_ADD_ANCHOR_ID,
    SkillCard,
    SkillsByCategory,
    SkillsStatsBar,
    SkillsToolbar,
    filterSkillsByName,
    parseSkillsTabParam,
    type SkillsViewMode,
} from "@/features/talent/skills";
import { TALENT_PAGE_STACK } from "@/components/talent/ui/talent-workspace-ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import {
    useAddSkill,
    useTalentSkillsGaps,
    useTalentSkillsList,
    useTalentSkillsSummary,
} from "@/hooks/useTalentSkills";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import type { CatalogSkill, MySkill, SkillGap, SkillsTab } from "@/types/talent-skills";

export function TalentSkillsPage() {
    useCopilotPage("none", "Mes compétences");

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = parseSkillsTabParam(searchParams.get("tab"));
    const [selectedSkill, setSelectedSkill] = useState<MySkill | null>(null);
    const [catalogSkill, setCatalogSkill] = useState<CatalogSkill | null>(null);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<SkillsViewMode>("grid");
    const [searchQuery, setSearchQuery] = useState("");

    const summaryQuery = useTalentSkillsSummary();
    const listQuery = useTalentSkillsList({ limit: 100 });
    const gapsQuery = useTalentSkillsGaps(tab === "gaps");
    const addMutation = useAddSkill();

    const totalSkills = summaryQuery.data?.total;
    useWorkspaceTopbarMeta(
        "Mes compétences",
        totalSkills != null
            ? `${totalSkills} compétence${totalSkills > 1 ? "s" : ""} répertoriée${totalSkills > 1 ? "s" : ""}`
            : "Niveaux, gaps et catalogue",
    );

    const setTab = useCallback(
        (next: SkillsTab) => {
            setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                if (next === "mine") params.delete("tab");
                else params.set("tab", next);
                return params;
            });
        },
        [setSearchParams],
    );

    const openEditDrawer = (skill: MySkill) => setSelectedSkill(skill);
    const closeEditDrawer = () => setSelectedSkill(null);

    const openAddFromCatalog = (skill: CatalogSkill) => {
        setCatalogSkill(skill);
        setAddModalOpen(true);
    };

    const handleAddSkill = (payload: Parameters<typeof addMutation.mutate>[0]) => {
        addMutation.mutate(payload, {
            onSuccess: () => {
                setAddModalOpen(false);
                setCatalogSkill(null);
                setTab("mine");
            },
        });
    };

    const handleRequestFormation = (gap: SkillGap) => {
        navigate(`/workspace/talent/requests?type=formation&skill=${encodeURIComponent(gap.skill_name)}`);
    };

    const scrollToAdd = useCallback(() => {
        if (tab !== "mine") setTab("mine");
        window.requestAnimationFrame(() => {
            document.getElementById(SKILLS_ADD_ANCHOR_ID)?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    }, [tab, setTab]);

    const skills = listQuery.data ?? [];
    const filteredSkills = useMemo(() => filterSkillsByName(skills, searchQuery), [skills, searchQuery]);
    const gaps = gapsQuery.data ?? [];
    const showGlobalEmpty =
        tab === "mine" && !summaryQuery.isLoading && !summaryQuery.isError && summaryQuery.data?.total === 0;
    const searchTrimmed = searchQuery.trim();
    const showSearchEmpty =
        tab === "mine" &&
        !listQuery.isLoading &&
        !listQuery.isError &&
        skills.length > 0 &&
        filteredSkills.length === 0 &&
        searchTrimmed.length > 0;

    return (
        <div className={TALENT_PAGE_STACK}>
            {summaryQuery.isError ? (
                <ErrorState
                    title="Résumé indisponible"
                    message="Impossible de charger les indicateurs compétences."
                    detail={
                        summaryQuery.error instanceof Error ? summaryQuery.error.message : String(summaryQuery.error)
                    }
                    onRetry={() => void summaryQuery.refetch()}
                />
            ) : (
                <SkillsStatsBar
                    summary={summaryQuery.data}
                    isLoading={summaryQuery.isLoading}
                    onAddCertifiedClick={scrollToAdd}
                />
            )}

            <SkillsToolbar
                tab={tab}
                mineCount={summaryQuery.data?.total}
                gapsCount={gapsQuery.data?.length}
                onTabChange={setTab}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onAddClick={() => setTab("catalog")}
            />

            {tab === "mine" ? (
                <>
                    {listQuery.isLoading ? (
                        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className="h-24 animate-pulse rounded-lg bg-secondary" />
                            ))}
                        </div>
                    ) : null}

                    {listQuery.isError ? (
                        <ErrorState
                            title="Compétences indisponibles"
                            message="Impossible de charger vos compétences."
                            detail={listQuery.error instanceof Error ? listQuery.error.message : String(listQuery.error)}
                            onRetry={() => void listQuery.refetch()}
                        />
                    ) : null}

                    {showGlobalEmpty ? (
                        <div className="flex flex-col items-center gap-4">
                            <EmptyState>
                                <EmptyState.Content>
                                    <EmptyState.Title>Aucune compétence pour l&apos;instant</EmptyState.Title>
                                    <EmptyState.Description>
                                        Ajoutez vos compétences depuis le catalogue pour construire votre profil.
                                    </EmptyState.Description>
                                </EmptyState.Content>
                                <EmptyState.Footer>
                                    <Button type="button" color="primary" size="sm" onClick={() => setTab("catalog")}>
                                        Parcourir le catalogue
                                    </Button>
                                </EmptyState.Footer>
                            </EmptyState>
                        </div>
                    ) : null}

                    {showSearchEmpty ? (
                        <p className="text-sm text-tertiary">
                            Aucune compétence ne correspond à « {searchTrimmed} »
                        </p>
                    ) : null}

                    {!listQuery.isLoading && !listQuery.isError && filteredSkills.length > 0 ? (
                        viewMode === "category" ? (
                            <SkillsByCategory skills={filteredSkills} onSkillClick={openEditDrawer} />
                        ) : (
                            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                                {filteredSkills.map((skill) => (
                                    <SkillCard key={skill.skill_id} skill={skill} onClick={openEditDrawer} />
                                ))}
                            </div>
                        )
                    ) : null}
                </>
            ) : null}

            {tab === "gaps" ? (
                <>
                    {gapsQuery.isLoading ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-40 animate-pulse rounded-2xl bg-secondary" />
                            ))}
                        </div>
                    ) : null}

                    {gapsQuery.isError ? (
                        <ErrorState
                            title="Lacunes indisponibles"
                            message="Impossible de charger les écarts de compétences."
                            detail={gapsQuery.error instanceof Error ? gapsQuery.error.message : String(gapsQuery.error)}
                            onRetry={() => void gapsQuery.refetch()}
                        />
                    ) : null}

                    {!gapsQuery.isLoading && !gapsQuery.isError && gaps.length === 0 ? (
                        <EmptyState>
                            <EmptyState.Content>
                                <EmptyState.Title>Aucune lacune identifiée</EmptyState.Title>
                                <EmptyState.Description>
                                    Vos compétences couvrent les besoins de vos projets actuels.
                                </EmptyState.Description>
                            </EmptyState.Content>
                        </EmptyState>
                    ) : null}

                    {!gapsQuery.isLoading && !gapsQuery.isError && gaps.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {gaps.map((gap) => (
                                <SkillGapCard
                                    key={gap.skill_id}
                                    gap={gap}
                                    onRequestFormation={handleRequestFormation}
                                />
                            ))}
                        </div>
                    ) : null}
                </>
            ) : null}

            {tab === "catalog" ? (
                <div className="rounded-lg border border-secondary/60 bg-primary p-4 shadow-sm">
                    <CatalogList onAdd={openAddFromCatalog} />
                </div>
            ) : null}

            <SkillEditDrawer open={Boolean(selectedSkill)} skill={selectedSkill} onClose={closeEditDrawer} />

            <AddSkillModal
                isOpen={addModalOpen}
                skill={catalogSkill}
                isSubmitting={addMutation.isPending}
                onOpenChange={(open) => {
                    setAddModalOpen(open);
                    if (!open) setCatalogSkill(null);
                }}
                onSubmit={handleAddSkill}
            />
        </div>
    );
}
