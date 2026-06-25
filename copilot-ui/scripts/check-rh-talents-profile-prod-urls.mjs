#!/usr/bin/env node
/**
 * Garde-fous CI — WF_RH_Talents_Profile_CRUD
 * Vérifie URLs prod absolues, pas de localhost, pas enterprise_id en query/body API.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "src");
const API_FILE = join(ROOT, "api", "rh-talents-profile.api.ts");
const CONFIG_FILE = join(ROOT, "lib", "api-config.ts");
const COMPONENTS_DIR = join(ROOT, "components", "rh", "talents-profile");

const failures = [];

function read(path) {
    return readFileSync(path, "utf8");
}

function walk(dir) {
    const out = [];
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) out.push(...walk(p));
        else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
    }
    return out;
}

// 1. PAS d'URL relative /webhook/rh/accounts/talent dans l'API
const apiSrc = read(API_FILE);
if (/['"`]\/webhook\/rh\/accounts\/talent/.test(apiSrc)) {
    failures.push("URL relative détectée dans rh-talents-profile.api.ts");
}

// 2. PAS de localhost dans api + config
for (const file of [API_FILE, CONFIG_FILE]) {
    const src = read(file);
    if (/localhost|192\.168|127\.0\.0\.1/.test(src)) {
        failures.push(`localhost/IP locale dans ${relative(ROOT, file)}`);
    }
}

// 3. PAS de enterprise_id dans params/body de l'API (réponse OK)
const enterpriseInRequest = apiSrc.match(/params\.enterprise_id|enterprise_id\s*:/g);
if (enterpriseInRequest?.some((m) => !m.includes("//"))) {
    const bad = apiSrc.split("\n").filter((l) => /params\.enterprise_id|enterprise_id\s*:/.test(l) && !l.trim().startsWith("//") && !l.includes("str(root.enterprise_id") && !l.includes("talent.enterprise_id"));
    if (bad.length) failures.push("enterprise_id dans requête API: " + bad.join(" | "));
}

// 4. PATCH body vide — pas de champs status/name/email dans patch call
const patchBlock = apiSrc.match(/httpClient\.patch[\s\S]{0,200}/);
if (patchBlock && /,\s*\{[^}]*(name|email|status)/.test(patchBlock[0])) {
    failures.push("PATCH ne doit pas envoyer name/email/status");
}

// 5. Pas de recalcul has_portal_access = user_id dans composants
if (statSync(COMPONENTS_DIR).isDirectory()) {
    for (const file of walk(COMPONENTS_DIR)) {
        const src = read(file);
        if (/has_portal_access\s*=.*user_id|!!\s*.*user_id/.test(src)) {
            failures.push(`Recalcul has_portal_access dans ${relative(ROOT, file)}`);
        }
    }
}

// api-config doit exporter API_BASE prod par défaut
const configSrc = read(CONFIG_FILE);
if (!configSrc.includes("n8nprod.aphelionxinnovations.com")) {
    failures.push("api-config.ts doit référencer n8nprod.aphelionxinnovations.com");
}

if (!configSrc.includes("wf-rh-talent-patch-v1")) {
    failures.push("api-config.ts doit exposer wf-rh-talent-patch-v1 pour PATCH");
}
if (!configSrc.includes("wf-rh-talent-delete-v1")) {
    failures.push("api-config.ts doit exposer wf-rh-talent-delete-v1 pour DELETE");
}

if (!apiSrc.includes("rhAccountsTalentProfilePatchPath")) {
    failures.push("rh-talents-profile.api.ts doit utiliser rhAccountsTalentProfilePatchPath");
}
if (!apiSrc.includes("rhAccountsTalentProfileDeletePath")) {
    failures.push("rh-talents-profile.api.ts doit utiliser rhAccountsTalentProfileDeletePath");
}

if (failures.length) {
    console.error("check-rh-talents-profile-prod-urls: ÉCHEC\n");
    for (const f of failures) console.error("  ✗", f);
    process.exit(1);
}

console.log("check-rh-talents-profile-prod-urls: OK");
