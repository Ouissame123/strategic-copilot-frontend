#!/usr/bin/env node
/**
 * Garde-fous Copilot Manager v3 — types, API, icônes, routes centralisées.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");
const copilotDir = path.join(src, "components", "manager-copilot");
const apiFile = path.join(src, "api", "manager-copilot.api.ts");

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

function walkTs(dir, hits, test) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkTs(full, hits, test);
            continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        const text = fs.readFileSync(full, "utf8");
        if (test(text, full)) hits.push(path.relative(root, full));
    }
}

console.log("🔍 Audit Manager Copilot\n");

const apiSrc = read("src/api/manager-copilot.api.ts");
if (/enterprise_id/.test(apiSrc) && /body|mutate|post|patch/i.test(apiSrc)) {
    const bodyLines = apiSrc
        .split("\n")
        .filter((l) => /enterprise_id/.test(l) && /(post|patch|body)/i.test(l));
    if (bodyLines.length) fail("enterprise_id JAMAIS dans body", bodyLines[0]);
    else ok("enterprise_id JAMAIS dans body");
} else {
    ok("enterprise_id JAMAIS dans body");
}

const lucideHits = [];
walkTs(copilotDir, lucideHits, (text) => /from\s+["']lucide-react["']/.test(text));
if (lucideHits.length) fail("Pas de lucide-react dans manager-copilot/", lucideHits.join(", "));
else ok("Pas de lucide-react dans manager-copilot/");

const loaderHits = [];
walkTs(copilotDir, loaderHits, (text) => /\bLoader2\b/.test(text));
if (loaderHits.length) fail("Pas de Loader2", loaderHits.join(", "));
else ok("Pas de Loader2");

const hardcodedWebhook =
    /["'`]\/webhook\/[^"'`]+["'`]/.test(apiSrc) && !/API_ROUTES/.test(apiSrc.split("/webhook/")[0] ?? "");
if (/["'`]\/webhook\//.test(apiSrc)) {
    const bad = apiSrc
        .split("\n")
        .filter((l) => /["'`]\/webhook\//.test(l) && !/API_ROUTES/.test(l));
    if (bad.length) fail("Routes centralisées via API_ROUTES", bad[0].trim());
    else ok("Routes centralisées via API_ROUTES");
} else {
    ok("Routes centralisées via API_ROUTES");
}

const requiredComponents = [
    "ManagerCopilotPanel.tsx",
    "ConversationsSidebar.tsx",
    "ConversationItem.tsx",
    "ChatThread.tsx",
    "AssistantMessage.tsx",
    "UserMessage.tsx",
    "CitationChip.tsx",
    "SuggestedActionsButtons.tsx",
    "SourcesStrip.tsx",
    "ChatInputBox.tsx",
];
for (const file of requiredComponents) {
    const rel = `src/components/manager-copilot/${file}`;
    if (fs.existsSync(path.join(root, rel))) ok(`Composant ${file}`);
    else fail(`Composant ${file}`, "manquant");
}

const drawer = read("src/components/copilot/CopilotDrawer.tsx");
if (/shouldUseManagerCopilotV3|USE_MANAGER_COPILOT_V3/.test(drawer)) ok("CopilotDrawer branche ManagerCopilotPanel");
else fail("CopilotDrawer branche ManagerCopilotPanel");

if (failed) {
    console.log(`\n❌ ${failed} check(s) failed`);
    process.exit(1);
}
console.log(`\n✅ All checks passed`);
