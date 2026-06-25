#!/usr/bin/env node
/**
 * Garde-fous UI dashboard talent :
 * - pas de valeurs KPI en dur dans les composants talent (hors types / commentaires)
 * - hook dashboard utilise l'endpoint existant
 * - composants atomiques < 200 lignes
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const talentComponentsDir = path.join(root, "src/components/talent");
const hookPath = path.join(root, "src/hooks/useTalentDashboard.ts");
const apiPath = path.join(root, "src/api/talent-dashboard.api.ts");

let failed = false;

function fail(msg) {
    console.error(`❌ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✅ ${msg}`);
}

// 1. Endpoint dashboard existant
const hookSrc = fs.readFileSync(hookPath, "utf8");
const apiSrc = fs.readFileSync(apiPath, "utf8");
if (!hookSrc.includes("talentDashboardApi") && !hookSrc.includes("talent/dashboard")) {
    fail("useTalentDashboard.ts ne référence pas l'API dashboard talent");
} else {
    ok("Hook dashboard talent branché sur l'API existante");
}
if (!apiSrc.includes("/webhook/talent/dashboard") && !apiSrc.includes("talent/dashboard")) {
    fail("talent-dashboard.api.ts ne référence pas /webhook/talent/dashboard");
} else {
    ok("Endpoint /webhook/talent/dashboard présent dans l'API");
}

// 2. Composants < 200 lignes (fichiers refonte à la racine talent/)
const componentFiles = [
    "HeroBlock.tsx",
    "KpiTile.tsx",
    "KpiRow.tsx",
    "ActionRequiredBlock.tsx",
    "ActiveProjectsCard.tsx",
    "OpportunitiesCard.tsx",
    "TopSkillsCard.tsx",
    "MyRequestsCard.tsx",
    "ScoreDonut.tsx",
].map((f) => path.join(talentComponentsDir, f));

for (const file of componentFiles) {
    if (!fs.existsSync(file)) {
        fail(`Composant manquant : ${path.relative(root, file)}`);
        continue;
    }
    const lines = fs.readFileSync(file, "utf8").split("\n").length;
    if (lines > 200) {
        fail(`${path.relative(root, file)} a ${lines} lignes (> 200)`);
    } else {
        ok(`${path.basename(file)} : ${lines} lignes`);
    }
}

// 3. Pas de valeurs KPI fictives en dur (heuristique — ignore classes Tailwind)
const hardcodedPattern = /\b(6\.5|5\.4)\b/;
const scanFiles = componentFiles.filter((f) => fs.existsSync(f));
for (const file of scanFiles) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith("//") || line.includes("interface ") || line.includes("type ")) continue;
        if (line.includes("className") || line.includes("py-0.5") || line.includes("px-0.5")) continue;
        if (hardcodedPattern.test(line)) {
            fail(`Valeur suspecte en dur dans ${path.relative(root, file)}:${i + 1} → ${line.trim()}`);
        }
    }
}
if (!failed) ok("Aucune valeur KPI fictive détectée");

if (failed) process.exit(1);
console.log("\nTous les garde-fous dashboard talent sont verts.");
