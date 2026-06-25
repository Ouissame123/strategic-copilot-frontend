#!/usr/bin/env node
/** Garde-fous CI — WF_RH_Accounts_Audit_View */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "src");
const API_FILE = join(ROOT, "api", "rh-accounts-audit.api.ts");
const PAGE_FILE = join(ROOT, "pages", "rh", "AccountsHealthPage.tsx");
const failures = [];
const apiSrc = readFileSync(API_FILE, "utf8");
const pageSrc = readFileSync(PAGE_FILE, "utf8");

if (/['"`]\/webhook\/rh\/accounts\/(audit|orphaned|stats)/.test(apiSrc)) {
    failures.push("URL relative /webhook/rh/accounts/* dans rh-accounts-audit.api.ts");
}
if (/localhost|192\.168|127\.0\.0\.1/.test(apiSrc)) {
    failures.push("localhost dans rh-accounts-audit.api.ts");
}
if (/params\.enterprise_id|body.*enterprise_id|enterprise_id.*params/.test(apiSrc)) {
    failures.push("enterprise_id en requête");
}
if (!apiSrc.includes("rhAccountsStatsPath")) failures.push("doit utiliser rhAccountsStatsPath()");
if (!apiSrc.includes("rhAccountsOrphanedPath")) failures.push("doit utiliser rhAccountsOrphanedPath()");
if (!apiSrc.includes("rhAccountsAuditPath")) failures.push("doit utiliser rhAccountsAuditPath()");

if (/portal_coverage_pct.*=.*Math|total_orphaned.*=.*\.length/.test(pageSrc)) {
    failures.push("recalcul KPI côté front interdit dans AccountsHealthPage");
}

if (failures.length) {
    console.error("check-rh-accounts-audit-prod-urls: ÉCHEC\n");
    for (const f of failures) console.error("  ✗", f);
    process.exit(1);
}
console.log("check-rh-accounts-audit-prod-urls: OK");
