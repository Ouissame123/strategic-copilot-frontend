#!/usr/bin/env node
/** Garde-fous CI — dialog Donner accès portail talent */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "src", "components", "rh", "accounts", "page");
const EXISTING = join(ROOT, "ExistingTalentForm.tsx");
const NEW_FORM = join(ROOT, "NewTalentOnboardForm.tsx");
const SHARED = join(ROOT, "onboard-portal-shared.tsx");

const failures = [];
const existingSrc = readFileSync(EXISTING, "utf8");
const newSrc = readFileSync(NEW_FORM, "utf8");
const sharedSrc = readFileSync(SHARED, "utf8");

const grantSubmit = existingSrc.match(/handleSubmit[\s\S]{0,350}/);
if (grantSubmit && /name:|email:|job_title:|department:/.test(grantSubmit[0])) {
    failures.push("Tab existant : grant ne doit pas envoyer name/email/job_title");
}

if (/department:\s*form\.department(,|\s*\})/.test(newSrc)) {
    failures.push("Onboard : utiliser spread conditionnel pour department");
}

if (!newSrc.includes("useRhUsers")) {
    failures.push("Manager dropdown doit utiliser useRhUsers");
}

for (const file of [EXISTING, NEW_FORM, SHARED]) {
    const src = readFileSync(file, "utf8");
    if (/console\.log.*password|console\.log.*pwd/i.test(src)) {
        failures.push(`console.log password dans ${file}`);
    }
}

if (!sharedSrc.includes("Stagiaire") || !sharedSrc.includes("Freelance")) {
    failures.push("Seniority dropdown : 8 valeurs DB attendues");
}

if (!existingSrc.includes("validateGrantFields")) {
    failures.push("ExistingTalentForm doit utiliser validateGrantFields");
}

if (!newSrc.includes("buildOnboardPayload")) {
    failures.push("NewTalentOnboardForm doit utiliser buildOnboardPayload");
}

if (failures.length) {
    console.error("check-portal-access-dialog: ÉCHEC\n");
    for (const f of failures) console.error("  ✗", f);
    process.exit(1);
}

console.log("check-portal-access-dialog: OK");
