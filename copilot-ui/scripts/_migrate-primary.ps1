$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$files = @(
  "src\pages\manager\projects\[id]\MissionControlPage.tsx",
  "src\pages\manager\projects\[id]\components\ProjectHero.tsx",
  "src\pages\manager\projects\[id]\components\OverviewTab.tsx",
  "src\pages\manager\projects\[id]\components\BudgetTab.tsx",
  "src\pages\manager\projects\[id]\components\TeamTab.tsx",
  "src\pages\manager\projects\[id]\components\RisksTab.tsx",
  "src\pages\manager\projects\[id]\components\DecisionsTab.tsx",
  "src\pages\manager\projects\[id]\components\WhatIfDrawer.tsx",
  "src\pages\manager\projects\[id]\components\ConfirmArbitrageDialog.tsx",
  "src\pages\manager\projects\[id]\components\LifecycleKanban.tsx",
  "src\pages\manager\projects\[id]\components\AgentHelperPanel.tsx",
  "src\pages\manager\projects\[id]\components\AgentMatchmakerPanel.tsx",
  "src\pages\manager\projects\[id]\components\AgentAnalystPanel.tsx",
  "src\pages\manager\projects\[id]\components\agent-bloc-shell.tsx",
  "src\components\CopilotTab.tsx",
  "src\components\projects\simulation\SimulationForm.tsx",
  "src\components\projects\simulation\SimulationResult.tsx",
  "src\components\projects\simulation\ScoreDeltaCard.tsx",
  "src\components\EditProjectModal.tsx",
  "src\components\AddRequirementModal.tsx",
  "src\components\CreateTaskModal.tsx",
  "src\components\EditTaskModal.tsx",
  "src\components\EditRequirementModal.tsx",
  "src\components\project\manager-project-detail-body.tsx",
  "src\components\project\project-what-if-simulator.tsx",
  "src\components\project-mission-control\sidebar\ProjectInsights.tsx"
)

foreach ($f in $files) {
  if (-not (Test-Path -LiteralPath $f)) { Write-Host "MISSING: $f"; continue }
  $c = Get-Content -LiteralPath $f -Raw
  $n = $c.Replace("violet-", "primary-")
  if ($n -ne $c) {
    Set-Content -LiteralPath $f -Value $n -NoNewline
    Write-Host "UPDATED: $f"
  } else {
    Write-Host "NOCHANGE: $f"
  }
}

$sdc = "src\components\projects\simulation\ScoreDeltaCard.tsx"
$c = Get-Content -LiteralPath $sdc -Raw
$n = $c.Replace("bg-blue-400", "bg-primary-400").Replace("bg-blue-500", "bg-primary-500")
Set-Content -LiteralPath $sdc -Value $n -NoNewline
Write-Host "UPDATED blues in ScoreDeltaCard"
