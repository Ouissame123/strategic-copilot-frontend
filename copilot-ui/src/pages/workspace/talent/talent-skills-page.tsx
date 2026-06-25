import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Button } from "@/components/base/buttons/button";
import { AddSkillModal } from "@/components/talent/skills/AddSkillModal";
import { CatalogSearch } from "@/components/talent/skills/CatalogSearch";
import { MySkillCard } from "@/components/talent/skills/MySkillCard";
import { SkillEditDrawer } from "@/components/talent/skills/SkillEditDrawer";
import { SkillGapCard } from "@/components/talent/skills/SkillGapCard";
import { SkillsKpiBar } from "@/components/talent/skills/SkillsKpiBar";
import { SkillsTabs } from "@/components/talent/skills/SkillsTabs";
import { TalentSkillsDensityToggle } from "@/components/talent/skills/TalentSkillsDensityToggle";
import {
    parseSkillsTabParam,
    readTalentSkillsDensity,
    writeTalentSkillsDensity,
    type TalentSkillsDensity,
} from "@/components/talent/skills/talent-skills-ui";
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
import { cx } from "@/utils/cx";

export function TalentSkillsPage() {
    useCopilotPage("none", "Mes compétences");

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = parseSkillsTabParam(searchParams.get("tab"));
    const [density, setDensity] = useState<TalentSkillsDensity>(() => readTalentSkillsDensity());
    const [selectedSkill, setSelectedSkill] = useState<MySkill | null>(null);
    const [catalogSkill, setCatalogSkill] = useState<CatalogSkill | null>(null);
    const [addModalOpen, setAddModalOpen] = useState(false);

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

    const toggleDensity = () => {
        const next: TalentSkillsDensity = density === "compact" ? "comfortable" : "compact";
        setDensity(next);
        writeTalentSkillsDensity(next);
    };

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

    const skills = listQuery.data ?? [];
    const gaps = gapsQuery.data ?? [];
    const showGlobalEmpty =
        tab === "mine" && !summaryQuery.isLoading && !summaryQuery.isError && summaryQuery.data?.total === 0;

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
                <SkillsKpiBar summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <SkillsTabs
                    tab={tab}
                    mineCount={summaryQuery.data?.total}
                    gapsCount={gapsQuery.data?.length}
                    onTabChange={setTab}
                />
                <div className="flex flex-wrap items-center gap-3">
                    {tab === "mine" ? (
                        <Button type="button" color="secondary" size="sm" onClick={() => setTab("catalog")}>
                            Ajouter une compétence
                        </Button>
                    ) : null}
                    {tab !== "catalog" ? <TalentSkillsDensityToggle density={density} onToggle={toggleDensity} /> : null}
                </div>
            </div>

            {tab === "mine" ? (
                <>
                    {listQuery.isLoading ? (
                        <div
                            className={cx(
                                "grid gap-3",
                                density === "compact" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2",
                            )}
                        >
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-36 animate-pulse rounded-2xl bg-secondary" />
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

                    {!listQuery.isLoading && !listQuery.isError && skills.length > 0 ? (
                        <div
                            className={cx(
                                "grid gap-3",
                                density === "compact" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2",
                            )}
                        >
                            {skills.map((skill) => (
                                <MySkillCard
                                    key={skill.skill_id}
                                    skill={skill}
                                    density={density}
                                    onClick={openEditDrawer}
                                />
                            ))}
                        </div>
                    ) : null}
                </>
            ) : null}

            {tab === "gaps" ? (
                <>
                    {gapsQuery.isLoading ? (
                        <div
                            className={cx(
                                "grid gap-3",
                                density === "compact" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2",
                            )}
                        >
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-40 animate-pulse rounded-2xl bg-secondary" />
                            ))}
                        </div>
                    ) : null}

                    {gapsQuery.isError ? (
                        <ErrorState
                            title="Gaps indisponibles"
                            message="Impossible de charger les écarts de compétences."
                            detail={gapsQuery.error instanceof Error ? gapsQuery.error.message : String(gapsQuery.error)}
                            onRetry={() => void gapsQuery.refetch()}
                        />
                    ) : null}

                    {!gapsQuery.isLoading && !gapsQuery.isError && gaps.length === 0 ? (
                        <EmptyState>
                            <EmptyState.Content>
                                <EmptyState.Title>Aucun gap identifié</EmptyState.Title>
                                <EmptyState.Description>
                                    Vos compétences couvrent les besoins de vos projets actuels.
                                </EmptyState.Description>
                            </EmptyState.Content>
                        </EmptyState>
                    ) : null}

                    {!gapsQuery.isLoading && !gapsQuery.isError && gaps.length > 0 ? (
                        <div
                            className={cx(
                                "grid gap-3",
                                density === "compact" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2",
                            )}
                        >
                            {gaps.map((gap) => (
                                <SkillGapCard
                                    key={gap.skill_id}
                                    gap={gap}
                                    density={density}
                                    onRequestFormation={handleRequestFormation}
                                />
                            ))}
                        </div>
                    ) : null}
                </>
            ) : null}

            {tab === "catalog" ? (
                <div className="rounded-lg border border-secondary/60 bg-primary p-4 shadow-sm">
                    <CatalogSearch onAdd={openAddFromCatalog} />
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
