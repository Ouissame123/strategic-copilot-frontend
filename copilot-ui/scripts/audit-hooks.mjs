#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");

let failed = 0;
function fail(msg) {
    console.error(`❌ ${msg}`);
    failed = 1;
}
function ok(msg) {
    console.log(`✅ ${msg}`);
}

function grepInDir(dir, pattern) {
    const hits = [];
    const walk = (d) => {
        for (const name of fs.readdirSync(d, { withFileTypes: true })) {
            const full = path.join(d, name.name);
            if (name.isDirectory()) {
                if (name.name !== "node_modules") walk(full);
                continue;
            }
            if (!/\.(ts|tsx|js|mjs)$/.test(name.name)) continue;
            const text = fs.readFileSync(full, "utf8");
            if (pattern.test(text)) hits.push(path.relative(root, full));
        }
    };
    walk(dir);
    return hits;
}

const dupHook = grepInDir(src, /from ['"]@\/hooks\/use-project-detail['"]/);
if (dupHook.length) fail(`Import use-project-detail encore présent : ${dupHook.join(", ")}`);
else ok("Pas d'import use-project-detail");

if (fs.existsSync(path.join(src, "hooks/use-project-detail.ts"))) {
    fail("hooks/use-project-detail.ts doit être supprimé");
} else ok("use-project-detail.ts supprimé");

const viabilityRefresh = fs.readFileSync(path.join(src, "hooks/use-project-viability-refresh.ts"), "utf8");
if (/useEffect/.test(viabilityRefresh)) fail("useEffect dans use-project-viability-refresh");
else ok("Pas d'auto-trigger useEffect dans viability-refresh");

const missionPage = fs.readFileSync(path.join(src, "pages/manager/ManagerProjectMissionControlPage.tsx"), "utf8");
if (/useProjects\s*\(\s*\{\s*limit:\s*500/.test(missionPage)) fail("limit: 500 dans ManagerProjectMissionControlPage");
else ok("Pas de useProjects({ limit: 500 }) sur la page détail");

const legacyKey = grepInDir(src, /\['manager',\s*'project-detail'/);
if (legacyKey.length) fail(`Clé legacy ['manager','project-detail'] : ${legacyKey.join(", ")}`);
else ok("Clé query unifiée project-detail");

if (failed) process.exit(1);
console.log("\nAudit hooks PR#1 OK.");
