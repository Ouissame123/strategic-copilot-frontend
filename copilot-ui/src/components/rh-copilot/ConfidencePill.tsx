import { cx } from "@/utils/cx";

export function ConfidencePill({ value, explanation }: { value: number; explanation?: string }) {
    const pct = Math.round(value <= 1 ? value * 100 : value);
    const color =
        value >= 0.85
            ? "border-green-300 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
            : value >= 0.65
              ? "border-yellow-300 bg-yellow-100 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200"
              : "border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200";

    return (
        <div
            className={cx("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs", color)}
            title={explanation}
        >
            <span className="font-semibold">Confiance {pct}%</span>
        </div>
    );
}
