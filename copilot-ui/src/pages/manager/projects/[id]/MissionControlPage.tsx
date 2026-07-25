import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { EditProjectModal } from "@/components/EditProjectModal";
import { CopilotTab } from "@/components/CopilotTab";
import { authStorage } from "@/lib/auth-storage";
import { useProjectDetail } from "@/hooks/use-project-detail";
import { useProjectAnalyzePolling } from "@/hooks/use-project-analyze-polling";
import { workspaceProjectsListPath } from "@/utils/workspace-routes";
import { ProjectHero } from "./components/ProjectHero";
import { ProjectViabilityBanner } from "./components/ProjectViabilityBanner";
import { ProjectPermanentSections } from "./components/ProjectPermanentSections";
import { WhatIfDrawer, type WhatIfDialogPreset } from "./components/WhatIfDrawer";
import { MissionControlSimulationTab } from "./components/MissionControlSimulationTab";
import { BudgetTab } from "./components/BudgetTab";
import { TeamTab } from "./components/TeamTab";
import { DecisionsTab } from "./components/DecisionsTab";
import { CompetencesTab } from "@/components/CompetencesTab";
import { TasksTab } from "@/components/TasksTab";
import { useMissionControlT } from "./use-mission-control-i18n";
import { cx } from "@/utils/cx";
import type { MissionControlProject } from "@/types/api.types";

const TABS = ["copilot", "team", "competences", "tasks", "budget", "simulation", "decisions"] as const;
type Tab = (typeof TABS)[number];

type MissionControlPageProps = {
    onBack?: () => void;
};

export default function MissionControlPage({ onBack }: MissionControlPageProps) {
    const { projectId: idParam = "" } = useParams();
    const projectId = idParam.trim();
    const navigate = useNavigate();
    const { mc, common } = useMissionControlT();
    const [tab, setTab] = useState<Tab>("copilot");
    const [whatIfOpen, setWhatIfOpen] = useState(false);
    const [whatIfPreset, setWhatIfPreset] = useState<WhatIfDialogPreset | null>(null);
    const [localProject, setLocalProject] = useState<MissionControlProject | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const tabsBarRef = useRef<HTMLDivElement>(null);
    const skipNextTabScrollRef = useRef(true);

    const openWhatIf = (preset?: WhatIfDialogPreset) => {
        setWhatIfPreset(preset ?? null);
        setWhatIfOpen(true);
    };

    const { data, isLoading, isError, refetch } = useProjectDetail(projectId);
    const detailSnapshotRef = useRef(data);
    detailSnapshotRef.current = data;

    const { analyzing, analyze } = useProjectAnalyzePolling({
        projectId,
        enterpriseId: data?.enterprise_id,
        getCurrentDetail: () => detailSnapshotRef.current,
        onComplete: (detail) => {
            if (detail.project) setLocalProject(detail.project);
        },
    });

    useEffect(() => {
        if (data?.project) setLocalProject(data.project);
    }, [data?.project.id]);

    useEffect(() => {
        if (skipNextTabScrollRef.current) {
            skipNextTabScrollRef.current = false;
            return;
        }
        tabsBarRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    }, [tab]);

    const handleBack =
        onBack ??
        (() => {
            const historyIdx = (window.history.state as { idx?: number } | null)?.idx;
            if (typeof historyIdx === "number" && historyIdx > 0) navigate(-1);
            else navigate(workspaceProjectsListPath("manager"));
        });

    if (!projectId) {
        return <p className="p-8 text-sm text-rose-600">{mc("errorLoad")}</p>;
    }

    if (isLoading) return <MissionControlSkeleton />;

    if (isError || !data?.project) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-rose-600">
                {mc("errorLoad")}
                <button type="button" onClick={() => void refetch()} className="text-primary-600 underline">
                    {common("retry")}
                </button>
            </div>
        );
    }

    const project = localProject ?? data.project;
    const authToken = authStorage.getAccessToken() ?? "";

    const handleAnalyze = () => {
        void analyze();
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-950">
            <ProjectHero
                project={project}
                onAnalyze={handleAnalyze}
                analyzing={analyzing}
                onWhatIf={() => openWhatIf()}
                onBack={handleBack}
                onEdit={() => setIsEditOpen(true)}
            />

            <div className="space-y-4 px-5 py-4">
                <ProjectViabilityBanner
                    viability={data.viability}
                    onNavigateToCopilot={() => setTab("copilot")}
                />

                <ProjectPermanentSections
                    project={project}
                    token={authToken}
                    onDescriptionUpdated={(updated) => setLocalProject(updated)}
                />
            </div>

            <div
                ref={tabsBarRef}
                className="sticky top-12 z-20 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            >
                <nav className="flex gap-1 overflow-x-auto px-5" aria-label={mc("navWorkspaceAria")}>
                    {TABS.map((tabId) => (
                        <button
                            key={tabId}
                            type="button"
                            onClick={() => setTab(tabId)}
                            className={cx(
                                "whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                                tab === tabId
                                    ? "border-b-2 border-primary-600 bg-primary-50/80 text-primary-800 dark:bg-primary-950/30 dark:text-primary-200"
                                    : "border-b-2 border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800/50",
                            )}
                        >
                            {mc(`tabs.${tabId}`)}
                        </button>
                    ))}
                </nav>
            </div>

            <div>
                {tab === "copilot" ? (
                    <CopilotTab
                        projectId={project.id}
                        aiRecommendation={data.ai_recommendation}
                        onNavigateToSimulation={() => setTab("simulation")}
                        onNavigateToDecisions={() => setTab("decisions")}
                    />
                ) : tab === "team" ? (
                    <TeamTab
                        projectId={project.id}
                        enterpriseId={data.enterprise_id}
                        token={authToken}
                        projectName={project.name}
                        assignments={data.assignments}
                        requirements={data.requirements}
                        skillsScore={
                            data.latest_viability?.score_skills_fit ??
                            data.ai_recommendation?.scores?.skills_fit ??
                            null
                        }
                        onRefresh={() => void refetch()}
                    />
                ) : tab === "competences" ? (
                    <CompetencesTab
                        projectId={project.id}
                        enterpriseId={data.enterprise_id}
                        token={authToken}
                        onNavigateToTeam={() => setTab("team")}
                    />
                ) : tab === "tasks" ? (
                    <TasksTab
                        projectId={project.id}
                        enterpriseId={data.enterprise_id}
                        token={authToken}
                        assignedTalents={data.assignments.map((a) => ({
                            id: a.talent_id,
                            name: a.talent_name?.trim() || a.talent_id,
                            allocation_pct: a.allocation_pct,
                        }))}
                    />
                ) : tab === "budget" ? (
                    <BudgetTab projectId={project.id} projectStatus={project.status} />
                ) : tab === "simulation" ? (
                    <MissionControlSimulationTab
                        projectId={project.id}
                        projectStatus={project.status}
                        assignments={data.assignments}
                        requirements={data.requirements}
                    />
                ) : tab === "decisions" ? (
                    <DecisionsTab projectId={project.id} />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
                        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{mc(`tabs.${tab}`)}</p>
                        <p className="text-sm text-slate-500">{mc("tabComingSoon")}</p>
                    </div>
                )}
            </div>

            {whatIfOpen ? (
                <WhatIfDrawer
                    key={`${whatIfPreset?.added_talent_id ?? "generic"}-${whatIfPreset?.allocation_pct ?? 0}`}
                    projectId={project.id}
                    assignedTalentIds={data.assignments.map((a) => a.talent_id)}
                    requirements={data.requirements.map((r) => ({
                        id: r.skill_id,
                        label: r.skill_name || r.skill_id,
                    }))}
                    preset={whatIfPreset}
                    onClose={() => {
                        setWhatIfOpen(false);
                        setWhatIfPreset(null);
                    }}
                    onAssigned={() => void refetch()}
                />
            ) : null}

            {isEditOpen && authToken ? (
                <EditProjectModal
                    project={project}
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    onSuccess={(updated) => setLocalProject((prev) => ({ ...(prev ?? project), ...updated }))}
                    token={authToken}
                />
            ) : null}

        </div>
    );
}

function MissionControlSkeleton() {
    return (
        <div className="flex flex-col gap-4 p-5 animate-pulse">
            <div className="h-48 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
    );
}
