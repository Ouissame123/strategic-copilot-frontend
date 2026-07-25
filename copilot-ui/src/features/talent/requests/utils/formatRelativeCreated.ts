/** Date relative FR via Intl.RelativeTimeFormat + date exacte pour tooltip. */
export function formatRelativeCreated(iso: string | null | undefined): {
    relative: string;
    absolute: string;
} | null {
    if (!iso?.trim()) return null;
    const then = new Date(iso);
    const ms = then.getTime();
    if (!Number.isFinite(ms)) return null;

    const absolute = then.toLocaleString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const diffSec = Math.round((ms - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
    const abs = Math.abs(diffSec);

    let relative: string;
    if (abs < 60) relative = rtf.format(diffSec, "second");
    else if (abs < 3600) relative = rtf.format(Math.round(diffSec / 60), "minute");
    else if (abs < 86400) relative = rtf.format(Math.round(diffSec / 3600), "hour");
    else if (abs < 86400 * 30) relative = rtf.format(Math.round(diffSec / 86400), "day");
    else if (abs < 86400 * 365) relative = rtf.format(Math.round(diffSec / (86400 * 30)), "month");
    else relative = rtf.format(Math.round(diffSec / (86400 * 365)), "year");

    return { relative, absolute };
}
