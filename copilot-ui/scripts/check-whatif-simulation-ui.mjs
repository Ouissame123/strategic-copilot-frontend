#!/usr/bin/env node
/**
 * Garde-fous UI simulation What-If (manager).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const apiPath = path.join(root, "src/api/whatif.api.ts");
const formPath = path.join(root, "src/components/projects/simulation/SimulationForm.tsx");
const simDir = path.join(root, "src/components/projects/simulation");

let failed = false;

function fail(msg) {
    console.error(`❌ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✅ ${msg}`);
}

const apiSrc = fs.readFileSync(apiPath, "utf8");
if (/enterprise_id/.test(apiSrc) && /body|post|req/.test(apiSrc)) {
    const bodySection = apiSrc.slice(apiSrc.indexOf("runWhatIfSimulation"));
    if (/enterprise_id/.test(bodySection)) fail("enterprise_id ne doit pas figurer dans le body what-if");
}
if (!apiSrc.includes("/webhook/api/project/what-if")) {
    fail("whatif.api.ts doit appeler /webhook/api/project/what-if");
} else {
    ok("Endpoint /webhook/api/project/what-if présent");
}

const formSrc = fs.readFileSync(formPath, "utf8");
if (!formSrc.includes("maxValue={200}") && !formSrc.includes("SIMULATION_ALLOC_MAX = 200")) {
    fail("SimulationForm doit borner allocation à 200");
} else {
    ok("Allocation bornée à 200 % dans le formulaire");
}

const componentFiles = fs.readdirSync(simDir).filter((f) => f.endsWith(".tsx"));
for (const file of componentFiles) {
    const full = path.join(simDir, file);
    const src = fs.readFileSync(full, "utf8");
    if (/\b(fetch|httpClient\.(post|patch|put|delete))\b/.test(src) && !src.includes("what-if")) {
        fail(`${file} ne doit pas appeler d'API d'écriture directement`);
    }
    const lines = src.split("\n").length;
    if (lines > 200) fail(`${file} a ${lines} lignes (> 200)`);
    else ok(`${file} : ${lines} lignes`);
}

if (!failed) ok("Aucune écriture API directe dans les composants simulation");

if (failed) process.exit(1);
console.log("\nGarde-fous simulation What-If OK.");
