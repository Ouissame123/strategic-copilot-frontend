export interface MobilityDriver {
    key: string;
    value: string | number | boolean;
}

export const MOBILITY_DRIVER_LABELS: Record<string, string> = {
    skills: "Compétences",
    availability: "Disponibilité",
    allocation: "Charge",
    mobility_bucket: "Profil",
    workload_ratio: "Charge",
    skill_category_count: "Domaines",
    contract_days_left: "Contrat",
    absences_90d: "Absences",
    tenure_years: "Ancienneté",
    perf_trend: "Perf. trend",
    salary_band: "Salaire",
};

/** Info-bulle pour les clés dont la valeur n’est pas évidente (ex. familles vs total skills). */
export const MOBILITY_DRIVER_TOOLTIPS: Partial<Record<string, string>> = {
    skill_category_count: "Nombre de familles de compétences utilisées dans le calcul mobilité.",
};

function formatDriverValue(value: string | number | boolean): string {
    if (typeof value === "boolean") return value ? "oui" : "non";
    if (value === "anchored") return "ancré";
    if (value === "open") return "ouvert";
    return String(value);
}

/** Normalise un élément drivers (string, objet API, variantes de clés). */
export function normalizeMobilityDriver(raw: unknown): MobilityDriver | null {
    if (typeof raw === "string") {
        const s = raw.trim();
        return s ? { key: "info", value: s } : null;
    }
    if (!raw || typeof raw !== "object") return null;

    const o = raw as Record<string, unknown>;
    const key = String(o.key ?? o.driver_key ?? o.name ?? "").trim();
    const rawValue = o.value ?? o.driver_value ?? o.val ?? o.score;

    if (!key) {
        if (typeof o.label === "string" && o.label.trim()) {
            return { key: "info", value: o.label.trim() };
        }
        if (typeof o.type === "string" && o.type.trim()) {
            return { key: "info", value: o.type.trim() };
        }
        return null;
    }

    if (rawValue === null || rawValue === undefined) {
        return { key, value: "—" };
    }
    if (typeof rawValue === "object") {
        return null;
    }

    return { key, value: rawValue as string | number | boolean };
}

export function parseMobilityDrivers(
    drivers: Array<string | MobilityDriver | Record<string, unknown>> | null | undefined,
): MobilityDriver[] {
    if (!Array.isArray(drivers)) return [];
    return drivers.map(normalizeMobilityDriver).filter((d): d is MobilityDriver => d !== null);
}

export function mobilityDriverBadgeLabel(driver: MobilityDriver): string {
    const label = MOBILITY_DRIVER_LABELS[driver.key] ?? driver.key;
    return `${label}: ${formatDriverValue(driver.value)}`;
}

export interface MobilityDriverBadgesProps {
    drivers: MobilityDriver[];
    className?: string;
    badgeClassName?: string;
    max?: number;
}

export function MobilityDriverBadges({
    drivers,
    className = "mt-2 flex flex-wrap gap-2",
    badgeClassName = "inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
    max = 8,
}: MobilityDriverBadgesProps) {
    if (drivers.length === 0) return null;

    return (
        <div className={className}>
            {drivers.slice(0, max).map((driver, index) => {
                const tooltip = MOBILITY_DRIVER_TOOLTIPS[driver.key];
                return (
                    <span
                        key={driver.key || String(index)}
                        className={badgeClassName}
                        title={tooltip}
                        {...(tooltip ? { "aria-label": `${mobilityDriverBadgeLabel(driver)} — ${tooltip}` } : {})}
                    >
                        {mobilityDriverBadgeLabel(driver)}
                    </span>
                );
            })}
        </div>
    );
}
