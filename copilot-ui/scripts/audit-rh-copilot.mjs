#!/usr/bin/env node
/**
 * Garde-fous Assistant RH v3 — types, API, icônes, routes centralisées.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const copilotDir = path.join(root, "src", "components", "rh-copilot");

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

console.log("🔍 Audit RH Copilot\n");

const apiSrc = read("src/api/rh-copilot.api.ts");
const routes = read("src/lib/api-routes.ts");
const flags = read("src/lib/feature-flags.ts");
if (/enterprise_id/.test(apiSrc) && /(post|patch|body)/i.test(apiSrc)) {
    const bodyLines = apiSrc.split("\n").filter((l) => /enterprise_id/.test(l) && /(post|patch|body)/i.test(l));
    if (bodyLines.length) fail("enterprise_id JAMAIS dans body", bodyLines[0]);
    else ok("enterprise_id JAMAIS dans body");
} else {
    ok("enterprise_id JAMAIS dans body");
}

const lucideHits = [];
walkTs(copilotDir, lucideHits, (text) => /from\s+["']lucide-react["']/.test(text));
if (lucideHits.length) fail("Pas de lucide-react", lucideHits.join(", "));
else ok("Pas de lucide-react");

const loaderHits = [];
walkTs(copilotDir, loaderHits, (text) => /\bLoader2\b/.test(text));
if (loaderHits.length) fail("Pas de Loader2", loaderHits.join(", "));
else ok("Pas de Loader2");

if (/API_ROUTES\.(rhConversationsList|rhChat|rhChatV3|rhConversationDetail|rhConversationArchive)/.test(apiSrc)) {
    ok("Routes via API_ROUTES");
} else {
    fail("Routes via API_ROUTES");
}

if (/rhChatV3/.test(routes)) ok("rhChatV3 défini dans API_ROUTES");
else fail("rhChatV3 défini dans API_ROUTES");

if (/USE_RH_CHAT_V3_RAG/.test(flags)) ok("Feature flag USE_RH_CHAT_V3_RAG");
else fail("Feature flag USE_RH_CHAT_V3_RAG");

if (/USE_RH_CHAT_V3_RAG/.test(apiSrc)) ok("rh-copilot.api bascule USE_RH_CHAT_V3_RAG");
else fail("rh-copilot.api bascule USE_RH_CHAT_V3_RAG");

if (/parseRhCitation/.test(read("src/api/rh-copilot.types.ts"))) ok("parseRhCitation défini");
else fail("parseRhCitation défini");

const required = [
    "RhCopilotPanel.tsx",
    "RhConversationsSidebar.tsx",
    "RhConversationItem.tsx",
    "AgentRoleBadge.tsx",
    "IntentBadge.tsx",
    "ConfidencePill.tsx",
    "RhAssistantMessage.tsx",
    "ActionsRecommandeesList.tsx",
    "RisquesAlertsList.tsx",
    "QuickRepliesStrip.tsx",
    "SourcesPanel.tsx",
    "RhChatInputBox.tsx",
    "CitationChip.tsx",
];
for (const file of required) {
    const rel = `src/components/rh-copilot/${file}`;
    if (fs.existsSync(path.join(root, rel))) ok(`Composant ${file}`);
    else fail(`Composant ${file}`, "manquant");
}

const entry = read("src/components/rh-copilot/RhChatEntry.tsx");
if (/shouldUseRhCopilotV3/.test(entry)) ok("RhChatEntry branche v3");
else fail("RhChatEntry branche v3");

if (/rhConversationsList|rhChat/.test(routes)) ok("API_ROUTES RH copilot");
else fail("API_ROUTES RH copilot");

if (failed) {
    console.log(`\n❌ ${failed} check(s) failed`);
    process.exit(1);
}
console.log(`\n✅ All checks passed`);
