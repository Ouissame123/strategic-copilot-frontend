import { Rows2, Rows3 } from "lucide-react";
import { cx } from "@/utils/cx";

export type DecisionLogDensity = "compact" | "comfortable";

type DensityToggleProps = {
    value: DecisionLogDensity;
    onChange: (value: DecisionLogDensity) => void;
};

export function DensityToggle({ value, onChange }: DensityToggleProps) {
    return (
        <div className="inline-flex rounded-lg border border-secondary bg-primary_alt p-0.5" role="group" aria-label="Densité d'affichage">
            <button
                type="button"
                aria-pressed={value === "comfortable"}
                aria-label="Affichage confortable"
                onClick={() => onChange("comfortable")}
                className={cx(
                    "rounded-md p-1.5 transition",
                    value === "comfortable" ? "bg-primary text-primary shadow-sm" : "text-tertiary hover:text-secondary",
                )}
            >
                <Rows2 className="size-3.5" />
            </button>
            <button
                type="button"
                aria-pressed={value === "compact"}
                aria-label="Affichage compact"
                onClick={() => onChange("compact")}
                className={cx(
                    "rounded-md p-1.5 transition",
                    value === "compact" ? "bg-primary text-primary shadow-sm" : "text-tertiary hover:text-secondary",
                )}
            >
                <Rows3 className="size-3.5" />
            </button>
        </div>
    );
}
