import { forwardRef } from "react";
import { Sparkles } from "lucide-react";
import { cx } from "@/utils/cx";

export type CopilotFloatingButtonProps = {
    onClick: () => void;
    hidden?: boolean;
    className?: string;
};

export const CopilotFloatingButton = forwardRef<HTMLButtonElement, CopilotFloatingButtonProps>(
    function CopilotFloatingButton({ onClick, hidden = false, className }, ref) {
        if (hidden) return null;

        return (
            <button
                ref={ref}
                type="button"
                onClick={onClick}
                aria-label="Ouvrir le copilote du projet"
                className={cx(
                    "fixed z-40 flex size-[52px] animate-in fade-in zoom-in-95 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-violet-500 text-white shadow-lg drop-shadow-xl transition-all duration-150 ease-out hover:scale-105 hover:shadow-xl active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 sm:bottom-6 sm:right-6 sm:size-14",
                    "bottom-4 right-4",
                    className,
                )}
                style={{ animationDuration: "200ms" }}
            >
                <Sparkles className="size-6 text-white" aria-hidden />
            </button>
        );
    },
);
