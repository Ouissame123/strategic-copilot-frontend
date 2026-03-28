const PROFILES_KEY = "strategic-copilot-profiles";

export interface StoredProfile {
    nom: string;
    prenom: string;
    adresse: string;
    email: string;
    dateNaissance: string;
}

function readAll(): Record<string, StoredProfile> {
    try {
        const raw = localStorage.getItem(PROFILES_KEY);
        if (!raw) return {};
        const data = JSON.parse(raw) as unknown;
        return typeof data === "object" && data !== null ? (data as Record<string, StoredProfile>) : {};
    } catch {
        return {};
    }
}

export function getProfile(email: string): StoredProfile | null {
    const key = email.trim().toLowerCase();
    const all = readAll();
    return all[key] ?? null;
}

export function saveProfile(email: string, profile: StoredProfile): void {
    const key = email.trim().toLowerCase();
    const all = readAll();
    all[key] = { ...profile, email: key };
    localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
}

export function getDisplayName(email: string): string {
    const p = getProfile(email);
    if (p?.prenom || p?.nom) return [p.prenom, p.nom].filter(Boolean).join(" ").trim();
    return email;
}
