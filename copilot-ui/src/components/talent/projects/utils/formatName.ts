/**
 * Capitalise un nom pour l'affichage uniquement (ne mute pas les données source).
 * Ex. "liriam" → "Liriam", "jean pierre" → "Jean Pierre".
 */
export function formatName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return "";
    return trimmed
        .split(/\s+/)
        .map((part) => {
            if (!part) return part;
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join(" ");
}
