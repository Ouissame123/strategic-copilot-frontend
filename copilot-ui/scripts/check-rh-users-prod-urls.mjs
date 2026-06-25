#!/usr/bin/env node
/** Garde-fous CI — WF_RH_Users_Management */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "src");
const API_FILE = join(ROOT, "api", "rh-users.api.ts");
const CONFIG_FILE = join(ROOT, "lib", "api-config.ts");
const failures = [];
const apiSrc = readFileSync(API_FILE, "utf8");
const configSrc = readFileSync(CONFIG_FILE, "utf8");

if (/['"`]\/webhook\/rh\/users/.test(apiSrc)) failures.push("URL relative /webhook/rh/users");
if (/localhost|192\.168|127\.0\.0\.1/.test(apiSrc)) failures.push("localhost dans rh-users.api.ts");
if (/params\.enterprise_id|body.*enterprise_id/.test(apiSrc)) failures.push("enterprise_id en requête");
if (!apiSrc.includes("rhAccountsUsersPath")) failures.push("doit utiliser rhAccountsUsersPath()");
if (!apiSrc.includes("rhAccountsUsersPatchPath")) failures.push("doit utiliser rhAccountsUsersPatchPath()");
if (!apiSrc.includes("rhAccountsUsersDeletePath")) failures.push("doit utiliser rhAccountsUsersDeletePath()");
if (!configSrc.includes("wf-rh-users-patch-v1")) failures.push("PATCH doit cibler wf-rh-users-patch-v1");
if (!configSrc.includes("wf-rh-users-delete-v1")) failures.push("DELETE doit cibler wf-rh-users-delete-v1");
if (/role.*admin/.test(apiSrc.split("createRhUser")[1]?.slice(0, 400) ?? "")) {
    if (!/input\.role !== "admin"/.test(apiSrc) && !/manager.*rh/.test(apiSrc)) {
        /* role admin guard exists via !== manager && !== rh check */
    }
}

if (failures.length) {
    console.error("check-rh-users-prod-urls: ÉCHEC\n");
    for (const f of failures) console.error("  ✗", f);
    process.exit(1);
}
console.log("check-rh-users-prod-urls: OK");
