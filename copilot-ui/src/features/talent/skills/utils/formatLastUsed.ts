const EPOCH_CUTOFF_YEAR = 2020;

/**
 * Affiche la dernière utilisation au format « juin 2026 ».
 * Retourne null si absente, invalide, ou &lt; 2020 (valeur BDD / epoch par défaut).
 */
export function formatLastUsed(value: string | null | undefined): string | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return null;
    const date = new Date(parsed);
    if (date.getFullYear() < EPOCH_CUTOFF_YEAR) return null;
    const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return label;
}

/** Préfixe « Utilisée » pour la meta line des cartes. */
export function formatLastUsedMeta(value: string | null | undefined): string | null {
    const formatted = formatLastUsed(value);
    if (!formatted) return null;
    return `Utilisée ${formatted}`;
}
