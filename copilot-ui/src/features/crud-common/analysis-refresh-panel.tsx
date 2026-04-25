import { useTranslation } from "react-i18next";
import type { AnalysisRefreshPayload } from "@/types/crud-domain";
import { cx } from "@/utils/cx";

type Props = {
    payload: AnalysisRefreshPayload | null | undefined;
    className?: string;
};

/**
 * Affiche uniquement les champs renvoyés par le backend après mutation.
 * Aucun calcul local — pas de logique métier.
 */
export function AnalysisRefreshPanel({ payload, className }: Props) {
    const { t } = useTranslation("dataCrud");
    if (!payload || typeof payload !== "object") return null;

    const entries = Object.entries(payload).filter(([, v]) => v !== undefined && v !== null);
    if (entries.length === 0) return null;

    return (
        <div
            className={cx(
                "rounded-xl border border-utility-brand-200 bg-utility-brand-50/80 p-4 text-sm shadow-xs dark:border-utility-brand-800 dark:bg-utility-brand-950/40",
                className,
            )}
            role="status"
        >
            <p className="text-xs font-semibold uppercase tracking-wide text-utility-brand-700 dark:text-utility-brand-300">
                {t("analysisTitle")}
            </p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {entries.map(([key, value]) => (
                    <div key={key} className="min-w-0">
                        <dt className="text-xs text-quaternary">{key}</dt>
                        <dd className="truncate font-medium text-primary">{formatValue(value)}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

function formatValue(v: unknown): string {
    if (v === null || v === undefined) return "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
}
