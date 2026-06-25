import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { validationCardClass } from "./validation-ui";

type ValidationEmptyStateProps = {
    onReset: () => void;
    variant?: "empty" | "filtered";
};

export function ValidationEmptyState({ onReset, variant = "filtered" }: ValidationEmptyStateProps) {
    const isAllEmpty = variant === "empty";

    return (
        <div className={validationCardClass + " p-12 text-center"}>
            <div
                className={
                    "mx-auto mb-4 flex size-12 items-center justify-center rounded-full " +
                    (isAllEmpty ? "bg-emerald-500/10" : "bg-secondary_subtle")
                }
            >
                <CheckCircle2 className={cxIcon(isAllEmpty)} aria-hidden />
            </div>
            <h3 className="text-base font-semibold text-primary">
                {isAllEmpty ? "Aucune validation en attente" : "Aucune validation trouvée"}
            </h3>
            <p className="mt-1 text-sm text-secondary">
                {isAllEmpty
                    ? "Tu es à jour. Le Copilot te notifiera dès qu'une nouvelle décision arrive."
                    : "Aucun résultat ne correspond aux filtres appliqués."}
            </p>
            {!isAllEmpty ? (
                <Button type="button" color="secondary" size="sm" className="mt-4" onClick={onReset}>
                    <RotateCcw className="mr-2 size-3.5" aria-hidden />
                    Réinitialiser les filtres
                </Button>
            ) : null}
        </div>
    );
}

function cxIcon(isAllEmpty: boolean) {
    return isAllEmpty ? "size-5 text-emerald-500" : "size-5 text-tertiary";
}
