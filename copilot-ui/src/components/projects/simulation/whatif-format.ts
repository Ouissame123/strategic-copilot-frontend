export const LEVER_LABELS: Record<string, string> = {
    planning: "Planning",
    capacity: "Capacité",
    alignment: "Alignement",
    skill_coverage: "Couverture compétences",
    aucun: "Aucun levier identifié",
};

export function formatScore(n: number | null | undefined): string {
    if (n === null || n === undefined || Number.isNaN(n)) return "N/A";
    return n.toFixed(2);
}

export function formatDelta(n: number | null | undefined): string {
    if (n === null || n === undefined || Number.isNaN(n)) return "N/A";
    const sign = n > 0 ? "+" : "";
    return `${sign}${n.toFixed(2)}`;
}
