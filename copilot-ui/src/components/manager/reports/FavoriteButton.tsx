import { Star } from "lucide-react";
import { cx } from "@/utils/cx";

type FavoriteButtonProps = {
    active: boolean;
    onToggle: () => void;
    className?: string;
};

export function FavoriteButton({ active, onToggle, className }: FavoriteButtonProps) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
            aria-pressed={active}
            className={cx(
                "inline-flex size-8 items-center justify-center rounded-full border transition-all duration-200 active:scale-90",
                active
                    ? "border-amber-300 bg-amber-50 text-amber-500 scale-110 shadow-sm dark:border-amber-700 dark:bg-amber-950/40"
                    : "border-slate-200 bg-white text-slate-400 hover:scale-105 hover:border-amber-200 hover:text-amber-400 dark:border-slate-700 dark:bg-slate-900",
                className,
            )}
        >
            <Star className={cx("size-4 transition-transform", active && "fill-current")} aria-hidden />
        </button>
    );
}
