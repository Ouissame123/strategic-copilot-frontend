import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const apiConfig = readFileSync(resolve("copilot-ui/src/lib/api-config.ts"), "utf8");
const accountsApi = readFileSync(resolve("copilot-ui/src/api/rh-accounts.api.ts"), "utf8");

if (!apiConfig.includes("n8nprod.aphelionxinnovations.com")) {
    console.error("check-rh-accounts-prod-urls: API_BASE prod manquant dans api-config.ts");
    process.exit(1);
}

if (!accountsApi.includes("@/lib/api-config")) {
    console.error("check-rh-accounts-prod-urls: rh-accounts.api.ts doit importer api-config");
    process.exit(1);
}

if (/return host \?/.test(accountsApi) || /: webhookPath;/.test(accountsApi)) {
    console.error("check-rh-accounts-prod-urls: URLs relatives détectées dans rh-accounts.api.ts");
    process.exit(1);
}

if (!accountsApi.includes("API_BASE")) {
    console.error("check-rh-accounts-prod-urls: rh-accounts.api.ts doit utiliser API_BASE");
    process.exit(1);
}

console.log("check-rh-accounts-prod-urls: OK");
