export type DeadlineTone = "default" | "warning" | "danger";

export type FormattedDeadline = {
    label: string;
    tone: DeadlineTone;
};

function startOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Formate une échéance relative (jamais de nombre négatif affiché).
 * - Future : « Échéance dans X j » (warning si X ≤ 7)
 * - Aujourd'hui : « Échéance aujourd'hui » (warning)
 * - Passée : « En retard de X j » (danger)
 */
export function formatDeadline(date: string | Date): FormattedDeadline {
    const target = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(target.getTime())) {
        return { label: "Échéance indisponible", tone: "default" };
    }

    const today = startOfLocalDay(new Date());
    const due = startOfLocalDay(target);
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

    if (diffDays === 0) {
        return { label: "Échéance aujourd'hui", tone: "warning" };
    }

    if (diffDays < 0) {
        return { label: `En retard de ${Math.abs(diffDays)} j`, tone: "danger" };
    }

    return {
        label: `Échéance dans ${diffDays} j`,
        tone: diffDays <= 7 ? "warning" : "default",
    };
}
