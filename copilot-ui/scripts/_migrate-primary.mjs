const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const files = [
  "src/pages/manager/projects/[id]/components/OverviewTab.tsx",
  "src/pages/manager/projects/[id]/components/BudgetTab.tsx",
  "src/pages/manager/projects/[id]/components/TeamTab.tsx",
  "src/pages/manager/projects/[id]/components/RisksTab.tsx",
  "src/pages/manager/projects/[id]/components/DecisionsTab.tsx",
  "src/pages/manager/projects/[id]/components/WhatIfDrawer.tsx",
  "src/pages/manager/projects/[id]/components/ConfirmArbitrageDialog.tsx",
  "src/pages/manager/projects/[id]/components/LifecycleKanban.tsx",
  "src/pages/manager/projects/[id]/components/AgentHelperPanel.tsx",
  "src/pages/manager/projects/[id]/components/AgentMatchmakerPanel.tsx",
  "src/pages/manager/projects/[id]/components/AgentAnalystPanel.tsx",
  "src/pages/manager/projects/[id]/components/agent-bloc-shell.tsx",
  "src/pages/manager/projects/[id]/components/AgentStrategistBloc.tsx",
  "src/components/CopilotTab.tsx",
  "src/components/CompetencesTab.tsx",
  "src/components/TasksTab.tsx",
  "src/components/projects/simulation/SimulationForm.tsx",
  "src/components/projects/simulation/SimulationResult.tsx",
  "src/components/projects/simulation/ScoreDeltaCard.tsx",
  "src/components/EditProjectModal.tsx",
  "src/components/AddRequirementModal.tsx",
  "src/components/CreateTaskModal.tsx",
  "src/components/EditTaskModal.tsx",
  "src/components/EditRequirementModal.tsx",
  "src/components/project/manager-project-detail-body.tsx",
  "src/components/project/project-what-if-simulator.tsx",
  "src/components/project-mission-control/sidebar/ProjectInsights.tsx",
];

// Files where violet is agent identity / semantic category — selective only
const selective = {
  "src/pages/manager/projects/[id]/components/AgentStrategistBloc.tsx": (c) =>
    c.replace(/bg-violet-600/g, "bg-primary-600").replace(/hover:bg-violet-700/g, "hover:bg-primary-700"),
  "src/components/CompetencesTab.tsx": (c) => {
    // Keep soft-skill violet + technique blue semantic badges; migrate CTAs / icons
    return c
      .replace(/bg-violet-600/g, "bg-primary-600")
      .replace(/hover:bg-violet-700/g, "hover:bg-primary-700")
      .replace(/text-violet-300/g, "text-primary-300");
  },
  "src/components/TasksTab.tsx": (c) => {
    // Keep column status blue + type badges (Livrable blue, Jalon violet); migrate brand interactions
    return c
      .replace(/border-violet-400/g, "border-primary-400")
      .replace(/border-violet-300/g, "border-primary-300")
      .replace(/border-violet-600/g, "border-primary-600")
      .replace(/bg-violet-600\/5/g, "bg-primary-600/5")
      .replace(/bg-violet-600/g, "bg-primary-600")
      .replace(/hover:bg-violet-700/g, "hover:bg-primary-700")
      .replace(/text-violet-600/g, "text-primary-600")
      .replace(/hover:text-violet-600/g, "hover:text-primary-600");
  },
  "src/components/projects/simulation/ScoreDeltaCard.tsx": (c) =>
    c
      .replace(/violet-/g, "primary-")
      .replace(/bg-blue-400/g, "bg-primary-400")
      .replace(/bg-blue-500/g, "bg-primary-500"),
};

for (const rel of files) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    console.log("MISSING", rel);
    continue;
  }
  let c = fs.readFileSync(fp, "utf8");
  let n;
  if (selective[rel]) {
    n = selective[rel](c);
  } else {
    n = c.replace(/violet-/g, "primary-");
  }
  if (n !== c) {
    fs.writeFileSync(fp, n);
    console.log("UPDATED", rel);
  } else {
    console.log("NOCHANGE", rel);
  }
}

console.log("done");
