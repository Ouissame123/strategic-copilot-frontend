export const REPORT_PERIOD_LABELS: Record<string, string> = {
    last_7_days: "7 derniers jours",
    last_30_days: "30 derniers jours",
    last_90_days: "90 derniers jours",
    ytd: "Depuis le 1ᵉʳ janvier",
};

export function parseEmailRecipients(raw: string): string[] {
    return raw
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.includes("@"));
}

export function formatReportDate(iso: string | null | undefined, locale = "fr-FR"): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
