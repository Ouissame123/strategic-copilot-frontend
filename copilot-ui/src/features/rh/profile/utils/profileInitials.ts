/**
 * Initiales profil : strip non-alpha, ignore parenthèses (ex. "sara (rh)" → SA).
 * Jamais de caractères comme "(" dans le rendu.
 */
export function profileInitials(name: string, emailFallback = ""): string {
    const withoutParens = name.replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ");
    const words = withoutParens
        .trim()
        .split(/\s+/)
        .map((part) => part.replace(/[^\p{L}]/gu, ""))
        .filter((part) => part.length > 0);

    if (words.length >= 2) {
        const a = words[0]?.charAt(0) ?? "";
        const b = words[1]?.charAt(0) ?? "";
        return `${a}${b}`.toUpperCase();
    }

    if (words.length === 1) {
        const w = words[0] ?? "";
        return w.slice(0, Math.min(2, w.length)).toUpperCase();
    }

    const local = emailFallback.split("@")[0]?.replace(/[^\p{L}]/gu, "") ?? "";
    if (local.length > 0) return local.slice(0, Math.min(2, local.length)).toUpperCase();
    return "?";
}
