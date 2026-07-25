const ABSOLUTE_FR = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

/** Date relative FR (passé / futur) via Intl.RelativeTimeFormat. */
export function formatMemberSinceRelative(iso: string): string {
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return "—";

    const diffSec = Math.round((then - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
    const abs = Math.abs(diffSec);

    if (abs < 60) return rtf.format(diffSec, "second");
    const diffMin = Math.round(diffSec / 60);
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
    const diffHour = Math.round(diffSec / 3600);
    if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
    const diffDay = Math.round(diffSec / 86400);
    if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
    const diffMonth = Math.round(diffSec / (86400 * 30));
    if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, "month");
    return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}

export function formatMemberSinceAbsolute(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return ABSOLUTE_FR.format(d);
}
