#!/usr/bin/env node
/** Garde-fous CI — Santé des comptes réservée à /admin/* */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "src");
const MAIN = join(ROOT, "main.tsx");
const WORKSPACE_NAV = join(ROOT, "layouts", "nav", "use-rh-workspace-nav.ts");
const ADMIN_LAYOUT = join(ROOT, "layouts", "admin-layout.tsx");
const failures = [];

const mainSrc = readFileSync(MAIN, "utf8");
const workspaceNavSrc = readFileSync(WORKSPACE_NAV, "utf8");
const adminLayoutSrc = readFileSync(ADMIN_LAYOUT, "utf8");

if (/path="accounts\/health"\s+element=\{<(?:RhAccountsHealthPage|AccountsHealthPage)/.test(mainSrc)) {
    failures.push("AccountsHealthPage ne doit pas être montée directement sous /workspace/rh");
}

if (/Santé des comptes/.test(workspaceNavSrc)) {
    failures.push('"Santé des comptes" ne doit pas apparaître dans use-rh-workspace-nav.ts');
}

if (!/accounts\/health/.test(adminLayoutSrc)) {
    failures.push('admin-layout.tsx doit contenir le lien "accounts/health"');
}

if (!/path="accounts\/health"\s+element=\{<AdminAccountsHealthPage/.test(mainSrc)) {
    failures.push("Route /admin/accounts/health manquante (AdminAccountsHealthPage)");
}

if (!/AdminAccountsHealthLegacyRedirect/.test(mainSrc)) {
    failures.push("Redirection legacy /workspace/rh/accounts/health manquante");
}

if (failures.length) {
    console.error("check-accounts-health-admin-only: ÉCHEC\n");
    for (const f of failures) console.error("  ✗", f);
    process.exit(1);
}
console.log("check-accounts-health-admin-only: OK");
