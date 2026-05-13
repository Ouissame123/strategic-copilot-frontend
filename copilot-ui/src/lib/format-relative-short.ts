import i18n from "@/i18n";

/** Date relative courte selon la langue UI (`common.managerWorkspace.relative`). */
export function formatRelativeShort(iso: string | undefined): string {
    const t = i18n.getFixedT(i18n.language, "common");
    const em = t("managerWorkspace.relative.emDash");
    if (!iso) return em;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return em;
    const diffMs = Date.now() - d.getTime();
    const diffM = Math.floor(diffMs / 60_000);
    if (diffM < 1) return t("managerWorkspace.relative.justNow");
    if (diffM < 60) return t("managerWorkspace.relative.minutesAgo", { count: diffM });
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return t("managerWorkspace.relative.hoursAgo", { count: diffH });
    return t("managerWorkspace.relative.daysAgo", { count: Math.floor(diffH / 24) });
}

export function formatRelativeFromMs(updatedAtMs: number): string {
    if (!updatedAtMs || Number.isNaN(updatedAtMs)) {
        return i18n.getFixedT(i18n.language, "common")("managerWorkspace.relative.emDash");
    }
    return formatRelativeShort(new Date(updatedAtMs).toISOString());
}
