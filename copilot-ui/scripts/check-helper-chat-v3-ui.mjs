#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let failed = false;
function fail(msg) {
    console.error(`❌ ${msg}`);
    failed = true;
}
function ok(msg) {
    console.log(`✅ ${msg}`);
}

const apiPath = path.join(root, "src/api/helper-chat-v3.api.ts");
const flagsPath = path.join(root, "src/lib/feature-flags.ts");
const copilotDir = path.join(root, "src/components/copilot");

const apiSrc = fs.readFileSync(apiPath, "utf8");
if (/enterprise_id/.test(apiSrc)) fail("enterprise_id ne doit pas figurer dans helper-chat-v3.api.ts");
else ok("Pas de enterprise_id dans le body API v3");

const webhookPathFile = path.join(root, "src/lib/n8n-webhook-path.ts");
const webhookSrc = fs.readFileSync(webhookPathFile, "utf8");
const hasChatV3Endpoint =
    apiSrc.includes("HELPER_CHAT_V3_PATH") ||
    apiSrc.includes("/api/helper/chat-v3") ||
    webhookSrc.includes("/api/helper/chat-v3");
if (!hasChatV3Endpoint) fail("Endpoint chat-v3 manquant");
else ok("Endpoint /api/helper/chat-v3 présent");

const flagsSrc = fs.readFileSync(flagsPath, "utf8");
if (!flagsSrc.includes("USE_HELPER_V3")) fail("Feature flag USE_HELPER_V3 manquant");
else ok("Feature flag USE_HELPER_V3 présent");

const v3Components = [
    "KpiHighlightStrip.tsx",
    "CitationChip.tsx",
    "SuggestedActionsButtons.tsx",
    "ChipsSourcesConsulted.tsx",
    "AssistantMessageBubble.tsx",
    "UserMessageBubble.tsx",
    "ChatInputBox.tsx",
    "ChatMessageList.tsx",
    "CopilotChatPanel.tsx",
];

for (const file of v3Components) {
    const full = path.join(copilotDir, file);
    if (!fs.existsSync(full)) {
        fail(`Composant manquant : ${file}`);
        continue;
    }
    const src = fs.readFileSync(full, "utf8");
    if (/from\s+['"]lucide-react['"]/.test(src)) fail(`${file} importe lucide-react`);
    if (/\bLoader2\b/.test(src)) fail(`${file} utilise Loader2`);
    if (/llama-3\.1|llama/i.test(src)) fail(`${file} contient un nom de modèle en dur`);
    if (/type:\s*['"]?uuid/i.test(src) || /talent:[a-f0-9]/i.test(src)) fail(`${file} : format citation string détecté`);
    const lines = src.split("\n").length;
    if (lines > 250) fail(`${file} : ${lines} lignes (> 250)`);
    else ok(`${file} : ${lines} lignes`);
}

const copilotFiles = fs.readdirSync(copilotDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
for (const file of copilotFiles) {
    const src = fs.readFileSync(path.join(copilotDir, file), "utf8");
    if (/from\s+['"]lucide-react['"]/.test(src)) fail(`lucide-react interdit dans copilot/${file}`);
    if (/\bLoader2\b/.test(src)) fail(`Loader2 interdit dans copilot/${file}`);
}
if (!failed) ok("Aucun lucide-react ni Loader2 dans src/components/copilot/");

if (failed) process.exit(1);
console.log("\nGarde-fous Helper Chat v3 OK.");
