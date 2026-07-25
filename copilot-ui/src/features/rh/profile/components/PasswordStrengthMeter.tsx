import { evaluatePasswordStrength, type PasswordStrengthLevel } from "../utils/passwordStrength";
import { cx } from "@/utils/cx";

const SEGMENT_ACTIVE: Record<Exclude<PasswordStrengthLevel, 0>, string> = {
    1: "bg-rose-500",
    2: "bg-amber-500",
    3: "bg-emerald-500",
};

const LABEL: Record<Exclude<PasswordStrengthLevel, 0>, string> = {
    1: "Faible",
    2: "Moyen",
    3: "Fort",
};

type PasswordStrengthMeterProps = {
    password: string;
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
    const { level } = evaluatePasswordStrength(password);
    const activeFill =
        level === 1 ? SEGMENT_ACTIVE[1] : level === 2 ? SEGMENT_ACTIVE[2] : level === 3 ? SEGMENT_ACTIVE[3] : null;
    const label = level === 0 ? "—" : LABEL[level];

    return (
        <div className="flex items-center gap-3" aria-live="polite">
            <div
                className="grid min-w-0 flex-1 grid-cols-3 gap-1.5"
                role="img"
                aria-label={`Robustesse : ${label}`}
            >
                {([1, 2, 3] as const).map((segment) => {
                    const active = level >= segment;
                    return (
                        <div
                            key={segment}
                            className={cx(
                                "h-1.5 rounded-full transition-colors duration-200",
                                active && activeFill ? activeFill : "bg-slate-200 dark:bg-slate-700",
                            )}
                        />
                    );
                })}
            </div>
            <span
                className={cx(
                    "shrink-0 text-xs font-medium",
                    level === 1 && "text-rose-600 dark:text-rose-400",
                    level === 2 && "text-amber-600 dark:text-amber-400",
                    level === 3 && "text-emerald-600 dark:text-emerald-400",
                    level === 0 && "text-slate-400 dark:text-slate-500",
                )}
            >
                {label}
            </span>
        </div>
    );
}
