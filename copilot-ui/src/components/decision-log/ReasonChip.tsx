import { X } from "lucide-react";
import { cx } from "@/utils/cx";

type ReasonChipProps = {
    code: string;
    label: string;
    count: number;
    active?: boolean;
    onClick: () => void;
    onClear?: () => void;
};

export function ReasonChip({ code, label, count, active, onClick, onClear }: ReasonChipProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cx(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                active
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-secondary bg-secondary_subtle text-secondary hover:border-violet-300",
            )}
        >
            <span>{label || code}</span>
            <span className={cx("tabular-nums", active ? "text-violet-100" : "text-tertiary")}>· {count}</span>
            {active && onClear ? (
                <span
                    role="button"
                    tabIndex={0}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-violet-500"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.stopPropagation();
                            onClear();
                        }
                    }}
                    aria-label="Effacer le filtre motif"
                >
                    <X className="size-3" />
                </span>
            ) : null}
        </button>
    );
}
