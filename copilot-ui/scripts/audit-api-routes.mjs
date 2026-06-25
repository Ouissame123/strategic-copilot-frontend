#!/usr/bin/env node
/**
 * Vérifie que les fichiers api/hooks n'ont plus d'URLs n8n manager hardcodées.
 * Échoue si une URL auditée subsiste hors `api-routes.ts`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");

let failed = 0;

function fail(name, out) {
    console.log(`❌ ${name}`);
    if (out) {
        const lines = out.split("\n").slice(0, 3);
        for (const line of lines) console.log(`   ${line}`);
    }
    failed++;
}

function ok(name) {
    console.log(`✅ ${name}`);
}

function walkFiles(dir) {
    const files = [];
    const walk = (d) => {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) {
                if (entry.name !== "node_modules") walk(full);
                continue;
            }
            if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(full);
        }
    };
    walk(dir);
    return files;
}

function grepInDirs(dirs, pattern, excludeRel = /api-routes\.ts$/) {
    const hits = [];
    for (const dir of dirs) {
        const abs = path.join(src, dir);
        if (!fs.existsSync(abs)) continue;
        for (const file of walkFiles(abs)) {
            const rel = path.relative(root, file);
            if (excludeRel.test(rel)) continue;
            const text = fs.readFileSync(file, "utf8");
            const lines = text.split("\n");
            for (let i = 0; i < lines.length; i++) {
                if (pattern.test(lines[i])) {
                    hits.push(`${rel}:${i + 1}:${lines[i].trim()}`);
                }
            }
        }
    }
    return hits;
}

function readFile(rel) {
    return fs.readFileSync(path.join(root, rel), "utf8");
}

console.log("🔍 Audit API routes\n");

const dirs = ["api", "hooks"];

const checks = [
    { name: "Pas de /webhook/wmp-* hardcoded", pattern: /webhook\/wmp-/ },
    { name: "Pas de /webhook/wmt-* hardcoded", pattern: /webhook\/wmt-/ },
    { name: "Pas de /webhook/mgr-budget-* hardcoded", pattern: /webhook\/mgr-budget/ },
    { name: "Pas de /webhook/wf-mgr-pr-req-* hardcoded", pattern: /webhook\/wf-mgr-pr-req/ },
    { name: "Pas de /webhook/wmc-* hardcoded", pattern: /webhook\/wmc-/ },
];

for (const c of checks) {
    const hits = grepInDirs(dirs, c.pattern);
    if (hits.length) fail(c.name, hits.join("\n"));
    else ok(c.name);
}

const rhSkills = readFile("src/api/rh-skills.api.ts");
if (/await fetch\(/.test(rhSkills)) fail("rh-skills utilise httpClient (pas fetch direct)");
else ok("rh-skills utilise httpClient (pas fetch direct)");

const reqApi = readFile("src/api/manager-project-requirements.api.ts");
if (/toLowerCase/.test(reqApi)) fail("Pas de .toLowerCase() sur les UUID requirements");
else ok("Pas de .toLowerCase() sur les UUID requirements");

const reqConfig = readFile("src/config/manager-project-requirements-api.config.ts");
if (/toLowerCase/.test(reqConfig)) fail("Pas de .toLowerCase() dans requirements config");
else ok("Pas de .toLowerCase() dans requirements config");

console.log("");
if (failed > 0) {
    console.log(`❌ ${failed} check(s) failed`);
    process.exit(1);
}
console.log(`✅ All ${checks.length + 3} checks passed`);
process.exit(0);
