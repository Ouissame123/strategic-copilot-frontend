/** Indique si un compte est actif (badge + toggle). */
export function isRhAccountActive(status?: string): boolean {
    const s = (status ?? "active").toLowerCase();
    return s === "active";
}

/** Statut attendu après un toggle_status (si l'API ne renvoie pas le nouveau statut). */
export function flippedRhAccountStatus(current?: string): string {
    return isRhAccountActive(current) ? "inactive" : "active";
}

/** Extrait le domaine entreprise depuis l'email JWT / utilisateur connecté. */
export function getEnterpriseDomainFromEmail(email: string): string | null {
    const parts = email.trim().split("@");
    const domain = parts.length === 2 ? parts[1]?.trim().toLowerCase() : "";
    return domain || null;
}

function normalizeNamePart(part: string): string {
    return part
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .trim();
}

/**
 * Génère un email entreprise : prenom.nom@domaine
 * Ex. "Carlos Mendoza" → carlos.mendoza@iberiandatasolutions.com
 */
export function generateEnterpriseEmail(fullName: string, domain: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0 || !domain.trim()) return "";
    const normalized = parts.map(normalizeNamePart).filter(Boolean);
    if (normalized.length === 0) return "";
    return `${normalized.join(".")}@${domain.trim().toLowerCase()}`;
}

/**
 * Génère prenom.nom@domaine depuis un nom complet (modal talent existant).
 * Ex. "Carlos Mendoza" → carlos.mendoza@iberiandatasolutions.com
 */
export function generateEmailFromFullName(fullName: string, domain = "entreprise.com"): string {
    const parts = fullName
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => p.replace(/[^a-z0-9]/g, ""))
        .filter(Boolean);
    if (parts.length === 0) return "";
    const prenom = parts[0] ?? "";
    const nom = parts[parts.length - 1] ?? "";
    const d = domain.trim().toLowerCase() || "entreprise.com";
    if (!prenom && !nom) return "";
    return `${prenom}.${nom}@${d}`;
}
