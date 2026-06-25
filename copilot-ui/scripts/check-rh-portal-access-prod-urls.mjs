#!/usr/bin/env node
/**
 * Garde-fous CI — WF_RH_Talent_Portal_Access
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "src");
const API_FILE = join(ROOT, "api", "rh-portal-access.api.ts");
const CONFIG_FILE = join(ROOT, "lib", "api-config.ts");

const failures = [];
const apiSrc = readFileSync(API_FILE, "utf8");
const configSrc = readFileSync(CONFIG_FILE, "utf8");

if (/['"`]\/webhook\/rh\/talents\/(onboard|unlinked)/.test(apiSrc)) {
    failures.push("URL relative onboard/unlinked dans rh-portal-access.api.ts");
}

if (/['"`]\/webhook\/rh\/talents\/[^'"]+\/grant-access/.test(apiSrc)) {
    failures.push("URL relative grant-access dans rh-portal-access.api.ts");
}

for (const file of [API_FILE, CONFIG_FILE]) {
    const src = readFileSync(file, "utf8");
    if (/localhost|192\.168|127\.0\.0\.1/.test(src)) {
        failures.push(`localhost/IP locale dans ${file}`);
    }
}

if (/params\.enterprise_id|enterprise_id\s*:/.test(apiSrc.replace(/\/\/.*$/gm, ""))) {
    const bad = apiSrc
        .split("\n")
        .filter(
            (l) =>
                /enterprise_id/.test(l) &&
                !l.trim().startsWith("//") &&
                !l.includes("enterprise_id:") === false,
        );
    const requestLines = apiSrc.split("\n").filter((l) => /params\.enterprise_id|body.*enterprise_id/.test(l));
    if (requestLines.length) failures.push("enterprise_id dans requête API");
}

const grantBlock = apiSrc.match(/grantPortalAccess[\s\S]{0,500}/);
if (
    grantBlock &&
    /name:|email:|job_title:|department:|phone:|seniority_level:|manager_user_id:/.test(grantBlock[0])
) {
    failures.push("grant-access ne doit envoyer que password");
}

if (!configSrc.includes("n8nprod.aphelionxinnovations.com")) {
    failures.push("api-config.ts doit référencer n8nprod");
}

if (!apiSrc.includes("rhTalentOnboardPath()")) {
    failures.push("onboard doit utiliser rhTalentOnboardPath()");
}
if (!apiSrc.includes("rhTalentGrantAccessPath")) {
    failures.push("grant-access doit utiliser rhTalentGrantAccessPath()");
}
if (!configSrc.includes("wf-rh-talent-grant-v1")) {
    failures.push("grant-access doit cibler wf-rh-talent-grant-v1");
}
if (!apiSrc.includes("rhTalentUnlinkedPath()")) {
    failures.push("unlinked doit utiliser rhTalentUnlinkedPath()");
}

if (failures.length) {
    console.error("check-rh-portal-access-prod-urls: ÉCHEC\n");
    for (const f of failures) failures.length && console.error("  ✗", f);
    process.exit(1);
}

console.log("check-rh-portal-access-prod-urls: OK");
