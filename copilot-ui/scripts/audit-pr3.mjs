#!/usr/bin/env node
/**
 * Garde-fous PR #3 — Kanban, What-If, Helper v3, Watchdog, deep links, code mort.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");

let failed = 0;

function fail(name, detail) {
    console.log(`❌ ${name}`);
    if (detail) console.log(`   ${detail}`);
    failed++;
}

function ok(name) {
    console.log(`✅ ${name}`);
}

function read(rel) {
    return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
    return fs.existsSync(path.join(root, rel));
}

console.log("🔍 Audit PR #3\n");

const projectsPage = read("src/pages/manager/ProjectsPage.tsx");
if (!/ManagerProjectsKanbanView/.test(projectsPage)) ok("Liste projets sans vue Kanban");
else fail("Liste projets sans vue Kanban");

const mainTsx = read("src/main.tsx");
if (!/WhatIfProjectPicker/.test(mainTsx)) ok("Pas de route WhatIfProjectPicker");
else fail("Pas de route WhatIfProjectPicker");

if (!exists("src/pages/manager/WhatIfProjectPicker.tsx")) ok("WhatIfProjectPicker supprimé");
else fail("WhatIfProjectPicker supprimé");

const managerNav = read("src/layouts/nav/manager-workspace-nav.ts");
if (!/what-if/.test(managerNav)) ok("Sidebar manager sans entrée What-If");
else fail("Sidebar manager sans entrée What-If");

const copilotDrawer = read("src/components/copilot/CopilotDrawer.tsx");
if (/USE_HELPER_V3|shouldUseHelperV3/.test(copilotDrawer)) ok("CopilotDrawer utilise FEATURES.USE_HELPER_V3");
else fail("CopilotDrawer utilise FEATURES.USE_HELPER_V3");

const useTeam = read("src/hooks/useTeam.ts");
if (/use_ai:\s*body\.use_ai\s*\?\?\s*defaultUseAi/.test(useTeam)) ok("useWatchdogScan transmet use_ai");
else fail("useWatchdogScan transmet use_ai");

if (!exists("src/services/projectTasksApi.ts")) ok("Pas de projectTasksApi (code mort)");
else fail("Pas de projectTasksApi (code mort)");

if (/searchParams\.get\(["']status["']\)/.test(projectsPage)) ok("ProjectsPage lit ?status=");
else fail("ProjectsPage lit ?status=");

const componentsDir = path.join(src, "components");
const INVALID_UNTITLED_ICONS = ["Loader2", "Sparkles"];
const invalidUntitledHits = [];
const walkInvalidIcons = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== "node_modules") walkInvalidIcons(full);
            continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        const text = fs.readFileSync(full, "utf8");
        const importMatch = text.match(/import\s*\{([^}]+)\}\s*from\s*["']@untitledui\/icons["']/);
        if (!importMatch) continue;
        const imported = importMatch[1];
        for (const bad of INVALID_UNTITLED_ICONS) {
            if (new RegExp(`\\b${bad}\\b`).test(imported)) {
                invalidUntitledHits.push(`${path.relative(root, full)} (${bad})`);
                break;
            }
        }
    }
};
walkInvalidIcons(componentsDir);
if (invalidUntitledHits.length) {
    fail("Pas d'icônes lucide importées depuis @untitledui/icons", invalidUntitledHits.join(", "));
} else ok("Pas d'icônes lucide importées depuis @untitledui/icons");

console.log("");
if (failed > 0) {
    console.log(`❌ ${failed} check(s) failed`);
    process.exit(1);
}
console.log("✅ All 8 checks passed");
process.exit(0);
