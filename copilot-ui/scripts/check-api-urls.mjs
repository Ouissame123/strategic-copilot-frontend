#!/usr/bin/env node
/**
 * Garde-fous CI — URLs prod absolues + pas de credentials cross-origin.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "src");
const failures = [];

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
            if (name === "node_modules") continue;
            walk(p, out);
        } else if (/\.(ts|tsx)$/.test(name)) {
            out.push(p);
        }
    }
    return out;
}

function read(path) {
    return readFileSync(path, "utf8");
}

const API_FILES = [
    join(ROOT, "api", "rh-accounts.api.ts"),
    join(ROOT, "api", "rh-portal-access.api.ts"),
    join(ROOT, "api", "rh-talents-profile.api.ts"),
    join(ROOT, "api", "rh-users.api.ts"),
    join(ROOT, "lib", "http-client.ts"),
    join(ROOT, "lib", "api-config.ts"),
    join(ROOT, "api", "api.ts"),
];

// 1. URL relative /webhook/rh/ dans les modules Accounts / Portal / Profile
for (const file of API_FILES) {
    const rel = relative(ROOT, file);
    const lines = read(file).split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
        if (/['"`]\/webhook\/rh\//.test(line)) {
            failures.push(`URL relative /webhook/rh/ dans ${rel}: ${trimmed.slice(0, 80)}`);
        }
    }
}

// 2. localhost dans api-config + clients
for (const file of [join(ROOT, "lib", "api-config.ts"), join(ROOT, "lib", "http-client.ts"), join(ROOT, "api", "api.ts")]) {
    const src = read(file);
    if (/localhost|192\.168|127\.0\.0\.1/.test(src)) {
        failures.push(`localhost/IP locale dans ${relative(ROOT, file)}`);
    }
}

// 3. credentials include / withCredentials true (src entier)
const srcFiles = walk(ROOT);
    const src = read(file);
    if (/credentials:\s*['"]include['"]/.test(src)) {
        failures.push(`credentials: 'include' dans ${relative(ROOT, file)}`);
    }
    if (/withCredentials:\s*true/.test(src)) {
        failures.push(`withCredentials: true dans ${relative(ROOT, file)}`);
    }
}

// 4. http-client must have withCredentials: false
const httpClientSrc = read(join(ROOT, "lib", "http-client.ts"));
if (!/withCredentials:\s*false/.test(httpClientSrc)) {
    failures.push("http-client.ts doit définir withCredentials: false");
}

// 5. api-config prod base
const configSrc = read(join(ROOT, "lib", "api-config.ts"));
if (!configSrc.includes("n8nprod.aphelionxinnovations.com")) {
    failures.push("api-config.ts doit référencer n8nprod");
}

if (failures.length) {
    console.error("check-api-urls: ÉCHEC\n");
    for (const f of failures) failures.length && console.error("  ✗", f);
    process.exit(1);
}

console.log("check-api-urls: OK");
