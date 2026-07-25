import { useTranslation } from "react-i18next";
import type { WhatIfResponse } from "@/api/whatif.types";
import { formatScore } from "./whatif-format";

function formatKpiValue(value: unknown): string {
    if (value == null) return "N/A";
    if (typeof value === "number" && Number.isFinite(value)) return formatScore(value);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "boolean") return value ? "Oui" : "Non";
    return JSON.stringify(value);
}

function readRiskLabel(risk: unknown): string {
    if (risk == null) return "—";
    if (typeof risk === "string") return risk;
    if (typeof risk === "object") {
        const o = risk as Record<string, unknown>;
        const label = o.label ?? o.title ?? o.message ?? o.description;
        if (label != null && String(label).trim()) return String(label).trim();
    }
    return JSON.stringify(risk);
}

type SimulatedKpiRisksProps = {
    kpi: WhatIfResponse["kpi"];
    risks: WhatIfResponse["risks"];
};

export function SimulatedKpiRisks({ kpi, risks }: SimulatedKpiRisksProps) {
    const { t } = useTranslation("common");
    const tm = (key: string) => t(`managerWorkspace.missionControl.${key}`);

    const kpiEntries =
        kpi && typeof kpi === "object" ? Object.entries(kpi).filter(([, v]) => v != null && v !== "") : [];
    const riskItems = Array.isArray(risks) ? risks.filter((r) => r != null) : [];

    if (kpiEntries.length === 0 && riskItems.length === 0) return null;

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {kpiEntries.length > 0 ? (
                <section className="rounded-xl border border-secondary bg-primary p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-fg-primary">{tm("simulationKpiTitle")}</h3>
                    <dl className="mt-3 space-y-2">
                        {kpiEntries.map(([key, value]) => (
                            <div key={key} className="flex items-baseline justify-between gap-2 text-sm">
                                <dt className="text-fg-tertiary">{key.replace(/_/g, " ")}</dt>
                                <dd className="font-mono font-semibold tabular-nums text-fg-secondary">
                                    {formatKpiValue(value)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>
            ) : null}

            {riskItems.length > 0 ? (
                <section className="rounded-xl border border-secondary bg-primary p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-fg-primary">{tm("simulationRisksTitle")}</h3>
                    <ul className="mt-3 space-y-2 text-sm text-fg-secondary">
                        {riskItems.map((risk, i) => (
                            <li key={i} className="flex gap-2">
                                <span className="text-orange-500" aria-hidden>
                                    •
                                </span>
                                <span>{readRiskLabel(risk)}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </div>
    );
}
