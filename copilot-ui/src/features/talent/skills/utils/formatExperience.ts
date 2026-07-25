/**
 * Formate les années d'expérience : « 1 an d'exp. » / « 2 ans d'exp. ».
 */
export function formatExperience(years: number): string {
    const n = Math.trunc(years);
    if (!Number.isFinite(n) || n < 0) return "";
    if (n === 1) return "1 an d'exp.";
    return `${n} ans d'exp.`;
}
